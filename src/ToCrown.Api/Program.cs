using System.Collections.Concurrent;
using ToCrown.Api;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
builder.Services.AddSingleton<DataStore>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()));

var app = builder.Build();
var tokens = new ConcurrentDictionary<string, string>();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

User? Current(HttpRequest request, DataStore store)
{
    var header = request.Headers.Authorization.ToString();
    var token = header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header[7..] : "";
    return tokens.TryGetValue(token, out var userId) ? store.Load().Users.FirstOrDefault(user => user.Id == userId && user.Enabled) : null;
}

bool IsAdmin(HttpRequest request, DataStore store)
{
    return Current(request, store)?.Role == "admin";
}

app.MapPost("/api/auth/login", (LoginRequest login, DataStore store) =>
{
    var db = store.Load();
    var user = db.Users.FirstOrDefault(item =>
        item.Email.Equals(login.Email.Trim(), StringComparison.OrdinalIgnoreCase) &&
        item.Password == login.Password &&
        item.Enabled);

    if (user is null) return Results.Unauthorized();

    var token = Guid.NewGuid().ToString("N");
    tokens[token] = user.Id;
    var player = db.Players.FirstOrDefault(item => item.UserId == user.Id);
    return Results.Ok(new LoginResponse(token, user, player));
});

app.MapGet("/api/me", (HttpRequest request, DataStore store) =>
{
    var user = Current(request, store);
    if (user is null) return Results.Unauthorized();
    var db = store.Load();
    return Results.Ok(new { user, player = db.Players.FirstOrDefault(player => player.UserId == user.Id) });
});

app.MapGet("/api/admin/snapshot", (HttpRequest request, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    return Results.Ok(store.Load());
});

app.MapGet("/api/player/snapshot", (HttpRequest request, DataStore store) =>
{
    var user = Current(request, store);
    if (user is null || user.Role != "player") return Results.Unauthorized();
    var db = store.Load();
    var player = db.Players.First(item => item.UserId == user.Id);
    var championshipIds = db.Championships
        .Where(champ => champ.Teams.Any(team => team.Players.Contains(player.Id)))
        .Select(champ => champ.Id)
        .ToHashSet();

    return Results.Ok(new
    {
        club = db.Club,
        user,
        player,
        championships = db.Championships.Where(champ => championshipIds.Contains(champ.Id)),
        players = db.Players,
        payments = db.Payments.Where(payment => payment.PlayerId == player.Id),
        requests = db.Requests.Where(req => req.PlayerId == player.Id)
    });
});

app.MapPost("/api/admin/players", (HttpRequest request, PlayerPayload payload, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    UpsertPlayer(payload, store, allowAccessChange: true);
    return Results.Ok(store.Load());
});

app.MapPut("/api/player/profile", (HttpRequest request, PlayerPayload payload, DataStore store) =>
{
    var user = Current(request, store);
    if (user is null || user.Role != "player" || payload.User.Id != user.Id) return Results.Unauthorized();
    UpsertPlayer(payload, store, allowAccessChange: false);
    return Results.Ok(store.Load().Players.First(player => player.UserId == user.Id));
});

app.MapPost("/api/admin/championships", (HttpRequest request, Championship championship, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(championship.Id)) championship.Id = Guid.NewGuid().ToString("N");
    foreach (var team in championship.Teams.Where(team => string.IsNullOrWhiteSpace(team.Id))) team.Id = Guid.NewGuid().ToString("N");
    store.Mutate(db => Upsert(db.Championships, championship));
    return Results.Ok(store.Load());
});

app.MapPost("/api/admin/payments", (HttpRequest request, Payment payment, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(payment.Id)) payment.Id = Guid.NewGuid().ToString("N");
    store.Mutate(db => Upsert(db.Payments, payment));
    return Results.Ok(store.Load());
});

app.MapPost("/api/requests", (HttpRequest request, RequestItem item, DataStore store) =>
{
    var user = Current(request, store);
    if (user is null) return Results.Unauthorized();

    var db = store.Load();
    if (user.Role == "player")
    {
        var player = db.Players.First(player => player.UserId == user.Id);
        item.PlayerId = player.Id;
        if (string.IsNullOrWhiteSpace(item.Status)) item.Status = "Solicitada";
        if (!db.Requests.Any(req => req.Id == item.Id)) item.Status = "Solicitada";
    }

    if (string.IsNullOrWhiteSpace(item.Id)) item.Id = Guid.NewGuid().ToString("N");
    store.Mutate(saved => Upsert(saved.Requests, item));
    return Results.Ok(store.Load());
});

app.MapPut("/api/admin/users/{id}/toggle", (HttpRequest request, string id, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    store.Mutate(db =>
    {
        var user = db.Users.FirstOrDefault(item => item.Id == id && item.Role == "player");
        if (user is not null) user.Enabled = !user.Enabled;
    });
    return Results.Ok(store.Load());
});

app.MapGet("/api/admin/export", (HttpRequest request, DataStore store) =>
{
    if (!IsAdmin(request, store)) return Results.Unauthorized();
    return Results.Json(store.Load());
});

app.MapFallbackToFile("index.html");
app.Run();

static void UpsertPlayer(PlayerPayload payload, DataStore store, bool allowAccessChange)
{
    store.Mutate(db =>
    {
        var user = payload.User;
        var player = payload.Player;

        if (string.IsNullOrWhiteSpace(user.Id)) user.Id = Guid.NewGuid().ToString("N");
        if (string.IsNullOrWhiteSpace(player.Id)) player.Id = Guid.NewGuid().ToString("N");
        player.UserId = user.Id;
        user.Role = "player";
        user.Name = player.FullName;
        if (!allowAccessChange)
        {
            var old = db.Users.First(existing => existing.Id == user.Id);
            user.Enabled = old.Enabled;
        }

        Upsert(db.Users, user);
        Upsert(db.Players, player);
    });
}

static void Upsert<T>(List<T> list, T item) where T : class
{
    var idProp = typeof(T).GetProperty("Id")!;
    var id = (string)idProp.GetValue(item)!;
    var index = list.FindIndex(existing => (string)idProp.GetValue(existing)! == id);
    if (index >= 0) list[index] = item;
    else list.Add(item);
}
