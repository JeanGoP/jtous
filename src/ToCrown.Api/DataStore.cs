using System.Text.Json;

namespace ToCrown.Api;

public interface IAppStore
{
    AppDb Load();
    void Save(AppDb db);
    void Mutate(Action<AppDb> change);
}

public sealed class DataStore : IAppStore
{
    private readonly string _path;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly object _lock = new();

    public DataStore(IWebHostEnvironment env)
    {
        var configured = Environment.GetEnvironmentVariable("TOCROWN_DB_PATH");
        _path = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "Data", "database.json")
            : configured;
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        if (!File.Exists(_path)) Save(Seed());
        EnsureBaselineUsers();
    }

    public AppDb Load()
    {
        lock (_lock)
        {
            var json = File.ReadAllText(_path);
            return JsonSerializer.Deserialize<AppDb>(json, _json) ?? Seed();
        }
    }

    public void Save(AppDb db)
    {
        lock (_lock)
        {
            File.WriteAllText(_path, JsonSerializer.Serialize(db, _json));
        }
    }

    public void Mutate(Action<AppDb> change)
    {
        lock (_lock)
        {
            var db = JsonSerializer.Deserialize<AppDb>(File.ReadAllText(_path), _json) ?? Seed();
            change(db);
            File.WriteAllText(_path, JsonSerializer.Serialize(db, _json));
        }
    }

    private void EnsureBaselineUsers()
    {
        var db = Load();
        var changed = false;
        changed |= EnsureUser(db, "superadmin@tocrown.com", "superadmin", "Super Administrador");
        changed |= EnsureUser(db, "admin@tocrown.com", "admin", "Administrador ToCrown");
        if (changed) Save(db);
    }

    private static bool EnsureUser(AppDb db, string email, string role, string name)
    {
        var user = db.Users.FirstOrDefault(item => item.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        if (user is null)
        {
            db.Users.Add(new User { Id = Guid.NewGuid().ToString("N"), Role = role, Name = name, Email = email, Password = "qwerty12345", Enabled = true });
            return true;
        }
        user.Role = role;
        user.Name = name;
        user.Password = "qwerty12345";
        user.Enabled = true;
        return true;
    }

    private static AppDb Seed()
    {
        var superAdmin = Guid.NewGuid().ToString("N");
        var admin = Guid.NewGuid().ToString("N");
        var u1 = Guid.NewGuid().ToString("N");
        var u2 = Guid.NewGuid().ToString("N");
        var p1 = Guid.NewGuid().ToString("N");
        var p2 = Guid.NewGuid().ToString("N");

        return new AppDb
        {
            Users =
            [
                new User { Id = superAdmin, Role = "superadmin", Name = "Super Administrador", Email = "superadmin@tocrown.com", Password = "qwerty12345", Enabled = true },
                new User { Id = admin, Role = "admin", Name = "Administrador ToCrown", Email = "admin@tocrown.com", Password = "qwerty12345", Enabled = true },
                new User { Id = u1, Role = "player", Name = "Valentina Rojas", Email = "vale@tocrown.com", Password = "Vale123", Enabled = true },
                new User { Id = u2, Role = "player", Name = "Camila Torres", Email = "cami@tocrown.com", Password = "Cami123", Enabled = true }
            ],
            Players =
            [
                new Player
                {
                    Id = p1, UserId = u1, FullName = "Valentina Rojas", DocumentType = "TI", Document = "10101010",
                    BirthDate = "2008-04-15", City = "Bogota", Phone = "3001112233", Address = "Cra 12 #45-20",
                    Guardian = "Martha Rojas", GuardianPhone = "3105557788", Position = "Punta", Number = "7",
                    Category = "Juvenil", Status = "Activa", Notes = "Capitana sub 18",
                    Sizes = new Sizes { Shirt = "M", Short = "M", Lycra = "M", Jacket = "M", Shoes = "38" },
                    Health = new Health { Blood = "O+", Eps = "Sura", Conditions = "Ninguna", Allergies = "No registra" },
                    Emergency = new Emergency { Name = "Martha Rojas", Phone = "3105557788", Relation = "Madre" }
                },
                new Player
                {
                    Id = p2, UserId = u2, FullName = "Camila Torres", DocumentType = "TI", Document = "20202020",
                    BirthDate = "2009-08-02", City = "Bogota", Phone = "3012223344", Address = "Cll 8 #11-44",
                    Guardian = "Andres Torres", GuardianPhone = "3114448899", Position = "Armadora", Number = "12",
                    Category = "Juvenil", Status = "Activa",
                    Sizes = new Sizes { Shirt = "S", Short = "S", Lycra = "S", Jacket = "S", Shoes = "37" },
                    Health = new Health { Blood = "A+", Eps = "Compensar", Conditions = "Asma leve", Allergies = "Polvo", Meds = "Inhalador" },
                    Emergency = new Emergency { Name = "Andres Torres", Phone = "3114448899", Relation = "Padre" }
                }
            ],
            Championships =
            [
                new Championship
                {
                    Name = "Liga Distrital 2026", City = "Bogota", Place = "Coliseo El Salitre",
                    Organizer = "Liga Distrital de Voleibol", StartDate = "2026-07-10", EndDate = "2026-08-25",
                    Category = "Juvenil", Status = "Inscrito", Notes = "Primera fase por grupos.",
                    Teams =
                    [
                        new SubTeam { Name = "ToCrown A", Players = [p1, p2] },
                        new SubTeam { Name = "ToCrown B", Players = [] }
                    ]
                }
            ],
            Payments =
            [
                new Payment { PlayerId = p1, Month = "Junio 2026", Amount = 85000, Paid = 50000, Date = "2026-06-05", Confirmed = true, Method = "Nequi", Note = "Abono mensualidad" },
                new Payment { PlayerId = p2, Month = "Junio 2026", Amount = 85000, Paid = 85000, Date = "2026-06-02", Confirmed = true, Method = "Efectivo", Note = "Pago completo" }
            ],
            Requests =
            [
                new RequestItem { PlayerId = p1, Type = "Uniforme", Version = "Local verde 2026", Size = "M", Date = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd"), Status = "Solicitada", Note = "Incluir pantaloneta" }
            ],
            News =
            [
                new NewsItem { Title = "Bienvenidas a ToCrown", Body = "Gestion deportiva, campeonatos y logros del club en un solo lugar.", Date = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd"), Active = true }
            ]
        };
    }
}
