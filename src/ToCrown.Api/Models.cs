namespace ToCrown.Api;

public sealed class AppDb
{
    public Club Club { get; set; } = new();
    public List<User> Users { get; set; } = [];
    public List<Player> Players { get; set; } = [];
    public List<Championship> Championships { get; set; } = [];
    public List<Payment> Payments { get; set; } = [];
    public List<RequestItem> Requests { get; set; } = [];
    public List<NewsItem> News { get; set; } = [];
}

public sealed class Club
{
    public string Name { get; set; } = "ToCrown Volleyball";
    public string City { get; set; } = "Bogota";
    public decimal MonthlyFee { get; set; } = 85000;
}

public sealed class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Role { get; set; } = "player";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public bool Enabled { get; set; } = true;
}

public sealed class Player
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserId { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string SecondName { get; set; } = "";
    public string FirstLastName { get; set; } = "";
    public string SecondLastName { get; set; } = "";
    public string FullName { get; set; } = "";
    public string DocumentType { get; set; } = "TI";
    public string Document { get; set; } = "";
    public string BirthDate { get; set; } = "";
    public string BirthCity { get; set; } = "";
    public string Sex { get; set; } = "";
    public string JoinDate { get; set; } = "";
    public string City { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Address { get; set; } = "";
    public string Guardian { get; set; } = "";
    public string GuardianPhone { get; set; } = "";
    public string GuardianRelation { get; set; } = "";
    public string Position { get; set; } = "";
    public string SecondaryPosition { get; set; } = "";
    public string Number { get; set; } = "";
    public string Category { get; set; } = "";
    public string Status { get; set; } = "Activa";
    public string Height { get; set; } = "";
    public string Weight { get; set; } = "";
    public string DominantHand { get; set; } = "";
    public Sizes Sizes { get; set; } = new();
    public Health Health { get; set; } = new();
    public Emergency Emergency { get; set; } = new();
    public string Photo { get; set; } = "";
    public bool HasPhoto { get; set; }
    public string IdentityPdf { get; set; } = "";
    public bool HasIdentityPdf { get; set; }
    public string Notes { get; set; } = "";
}

public sealed class Sizes
{
    public string Shirt { get; set; } = "";
    public string Short { get; set; } = "";
    public string Lycra { get; set; } = "";
    public string Jacket { get; set; } = "";
    public string KneePads { get; set; } = "";
    public string Shoes { get; set; } = "";
}

public sealed class Health
{
    public string Blood { get; set; } = "";
    public string Eps { get; set; } = "";
    public string Conditions { get; set; } = "";
    public string Allergies { get; set; } = "";
    public string Diseases { get; set; } = "";
    public string Meds { get; set; } = "";
    public string Injuries { get; set; } = "";
}

public sealed class Emergency
{
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Relation { get; set; } = "";
}

public sealed class Championship
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "";
    public string City { get; set; } = "";
    public string Place { get; set; } = "";
    public string Organizer { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string EndDate { get; set; } = "";
    public string Category { get; set; } = "";
    public string Status { get; set; } = "Inscrito";
    public string TitleWon { get; set; } = "";
    public string Notes { get; set; } = "";
    public List<SubTeam> Teams { get; set; } = [];
}

public sealed class SubTeam
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = "";
    public List<string> Players { get; set; } = [];
}

public sealed class Payment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string PlayerId { get; set; } = "";
    public string Month { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal Paid { get; set; }
    public string Date { get; set; } = "";
    public bool Confirmed { get; set; }
    public string Method { get; set; } = "";
    public string Note { get; set; } = "";
}

public sealed class RequestItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string PlayerId { get; set; } = "";
    public string Type { get; set; } = "";
    public string Version { get; set; } = "";
    public string Size { get; set; } = "";
    public string Date { get; set; } = "";
    public string Status { get; set; } = "Solicitada";
    public string Note { get; set; } = "";
}

public sealed class NewsItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Image { get; set; } = "";
    public string Date { get; set; } = "";
    public bool Active { get; set; } = true;
}

public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string Token, User User, Player? Player);
public sealed record PlayerPayload(User User, Player Player);
public sealed record WalletGenerationRequest(string Month, decimal DefaultAmount, List<string> ExcludedPlayerIds, Dictionary<string, decimal> Overrides);
public sealed record ChangePasswordRequest(string OldPassword, string NewPassword, string ConfirmPassword);
