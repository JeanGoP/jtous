using Microsoft.Data.SqlClient;

namespace ToCrown.Api;

public sealed class SqlDataStore : IAppStore
{
    private readonly string _connectionString;

    public SqlDataStore(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("ToCrownDb") ??
            Environment.GetEnvironmentVariable("SQLSERVER_CONNECTION_STRING") ??
            throw new InvalidOperationException("No SQL Server connection string configured.");
    }

    public AppDb Load()
    {
        using var cn = new SqlConnection(_connectionString);
        cn.Open();
        var db = new AppDb();

        using (var cmd = new SqlCommand("SELECT TOP 1 Name, City, MonthlyFee FROM dbo.Clubs ORDER BY Id", cn))
        using (var rd = cmd.ExecuteReader())
        {
            if (rd.Read())
            {
                db.Club = new Club { Name = S(rd, "Name"), City = S(rd, "City"), MonthlyFee = D(rd, "MonthlyFee") };
            }
        }

        using (var cmd = new SqlCommand("SELECT Id, Role, Name, Email, Password, Enabled FROM dbo.Users ORDER BY CreatedAt, Name", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read()) db.Users.Add(new User { Id = S(rd, "Id"), Role = S(rd, "Role"), Name = S(rd, "Name"), Email = S(rd, "Email"), Password = S(rd, "Password"), Enabled = B(rd, "Enabled") });
        }

        using (var cmd = new SqlCommand("SELECT * FROM dbo.Players ORDER BY FullName", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read())
            {
                db.Players.Add(new Player
                {
                    Id = S(rd, "Id"), UserId = S(rd, "UserId"), FullName = S(rd, "FullName"), DocumentType = S(rd, "DocumentType"), Document = S(rd, "Document"),
                    BirthDate = S(rd, "BirthDate"), City = S(rd, "City"), Phone = S(rd, "Phone"), Address = S(rd, "Address"), Guardian = S(rd, "Guardian"), GuardianPhone = S(rd, "GuardianPhone"),
                    Position = S(rd, "Position"), Number = S(rd, "Number"), Category = S(rd, "Category"), Status = S(rd, "Status"), Photo = S(rd, "Photo"), IdentityPdf = S(rd, "IdentityPdf"), Notes = S(rd, "Notes"),
                    Sizes = new Sizes { Shirt = S(rd, "Shirt"), Short = S(rd, "Short"), Lycra = S(rd, "Lycra"), Jacket = S(rd, "Jacket"), Shoes = S(rd, "Shoes") },
                    Health = new Health { Blood = S(rd, "Blood"), Eps = S(rd, "Eps"), Conditions = S(rd, "Conditions"), Allergies = S(rd, "Allergies"), Meds = S(rd, "Meds") },
                    Emergency = new Emergency { Name = S(rd, "EmergencyName"), Phone = S(rd, "EmergencyPhone"), Relation = S(rd, "EmergencyRelation") }
                });
            }
        }

        using (var cmd = new SqlCommand("SELECT * FROM dbo.Championships ORDER BY StartDate DESC", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read())
            {
                db.Championships.Add(new Championship
                {
                    Id = S(rd, "Id"), Name = S(rd, "Name"), City = S(rd, "City"), Place = S(rd, "Place"), Organizer = S(rd, "Organizer"),
                    StartDate = S(rd, "StartDate"), EndDate = S(rd, "EndDate"), Category = S(rd, "Category"), Status = S(rd, "Status"), TitleWon = S(rd, "TitleWon"), Notes = S(rd, "Notes")
                });
            }
        }

        using (var cmd = new SqlCommand("SELECT Id, ChampionshipId, Name FROM dbo.ChampionshipTeams ORDER BY Name", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read())
            {
                var champ = db.Championships.FirstOrDefault(item => item.Id == S(rd, "ChampionshipId"));
                champ?.Teams.Add(new SubTeam { Id = S(rd, "Id"), Name = S(rd, "Name") });
            }
        }

        using (var cmd = new SqlCommand("SELECT TeamId, PlayerId FROM dbo.TeamPlayers", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read())
            {
                var team = db.Championships.SelectMany(champ => champ.Teams).FirstOrDefault(item => item.Id == S(rd, "TeamId"));
                team?.Players.Add(S(rd, "PlayerId"));
            }
        }

        using (var cmd = new SqlCommand("SELECT * FROM dbo.Payments ORDER BY Date DESC", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read()) db.Payments.Add(new Payment { Id = S(rd, "Id"), PlayerId = S(rd, "PlayerId"), Month = S(rd, "Month"), Amount = D(rd, "Amount"), Paid = D(rd, "Paid"), Date = S(rd, "Date"), Confirmed = B(rd, "Confirmed"), Method = S(rd, "Method"), Note = S(rd, "Note") });
        }

        using (var cmd = new SqlCommand("SELECT * FROM dbo.Requests ORDER BY Date DESC", cn))
        using (var rd = cmd.ExecuteReader())
        {
            while (rd.Read()) db.Requests.Add(new RequestItem { Id = S(rd, "Id"), PlayerId = S(rd, "PlayerId"), Type = S(rd, "Type"), Version = S(rd, "Version"), Size = S(rd, "Size"), Date = S(rd, "Date"), Status = S(rd, "Status"), Note = S(rd, "Note") });
        }

        return db;
    }

    public void Mutate(Action<AppDb> change)
    {
        var db = Load();
        change(db);
        Save(db);
    }

    public void Save(AppDb db)
    {
        using var cn = new SqlConnection(_connectionString);
        cn.Open();
        using var tx = cn.BeginTransaction();
        Exec(cn, tx, "DELETE FROM dbo.TeamPlayers; DELETE FROM dbo.ChampionshipTeams; DELETE FROM dbo.Requests; DELETE FROM dbo.Payments; DELETE FROM dbo.Players; DELETE FROM dbo.Users; DELETE FROM dbo.Championships; DELETE FROM dbo.Clubs;");

        Exec(cn, tx, "INSERT INTO dbo.Clubs (Name, City, MonthlyFee) VALUES (@Name, @City, @MonthlyFee)",
            ("@Name", db.Club.Name), ("@City", db.Club.City), ("@MonthlyFee", db.Club.MonthlyFee));

        foreach (var u in db.Users)
            Exec(cn, tx, "INSERT INTO dbo.Users (Id, Role, Name, Email, Password, Enabled) VALUES (@Id,@Role,@Name,@Email,@Password,@Enabled)",
                ("@Id", u.Id), ("@Role", u.Role), ("@Name", u.Name), ("@Email", u.Email), ("@Password", u.Password), ("@Enabled", u.Enabled));

        foreach (var p in db.Players)
            Exec(cn, tx, @"INSERT INTO dbo.Players (Id,UserId,FullName,DocumentType,Document,BirthDate,City,Phone,Address,Guardian,GuardianPhone,Position,Number,Category,Status,Shirt,Short,Lycra,Jacket,Shoes,Blood,Eps,Conditions,Allergies,Meds,EmergencyName,EmergencyPhone,EmergencyRelation,Photo,IdentityPdf,Notes)
                VALUES (@Id,@UserId,@FullName,@DocumentType,@Document,@BirthDate,@City,@Phone,@Address,@Guardian,@GuardianPhone,@Position,@Number,@Category,@Status,@Shirt,@Short,@Lycra,@Jacket,@Shoes,@Blood,@Eps,@Conditions,@Allergies,@Meds,@EmergencyName,@EmergencyPhone,@EmergencyRelation,@Photo,@IdentityPdf,@Notes)",
                ("@Id", p.Id), ("@UserId", p.UserId), ("@FullName", p.FullName), ("@DocumentType", p.DocumentType), ("@Document", p.Document), ("@BirthDate", p.BirthDate), ("@City", p.City), ("@Phone", p.Phone), ("@Address", p.Address), ("@Guardian", p.Guardian), ("@GuardianPhone", p.GuardianPhone), ("@Position", p.Position), ("@Number", p.Number), ("@Category", p.Category), ("@Status", p.Status), ("@Shirt", p.Sizes.Shirt), ("@Short", p.Sizes.Short), ("@Lycra", p.Sizes.Lycra), ("@Jacket", p.Sizes.Jacket), ("@Shoes", p.Sizes.Shoes), ("@Blood", p.Health.Blood), ("@Eps", p.Health.Eps), ("@Conditions", p.Health.Conditions), ("@Allergies", p.Health.Allergies), ("@Meds", p.Health.Meds), ("@EmergencyName", p.Emergency.Name), ("@EmergencyPhone", p.Emergency.Phone), ("@EmergencyRelation", p.Emergency.Relation), ("@Photo", p.Photo), ("@IdentityPdf", p.IdentityPdf), ("@Notes", p.Notes));

        foreach (var c in db.Championships)
        {
            Exec(cn, tx, "INSERT INTO dbo.Championships (Id,Name,City,Place,Organizer,StartDate,EndDate,Category,Status,TitleWon,Notes) VALUES (@Id,@Name,@City,@Place,@Organizer,@StartDate,@EndDate,@Category,@Status,@TitleWon,@Notes)",
                ("@Id", c.Id), ("@Name", c.Name), ("@City", c.City), ("@Place", c.Place), ("@Organizer", c.Organizer), ("@StartDate", c.StartDate), ("@EndDate", c.EndDate), ("@Category", c.Category), ("@Status", c.Status), ("@TitleWon", c.TitleWon), ("@Notes", c.Notes));
            foreach (var t in c.Teams)
            {
                Exec(cn, tx, "INSERT INTO dbo.ChampionshipTeams (Id, ChampionshipId, Name) VALUES (@Id,@ChampionshipId,@Name)", ("@Id", t.Id), ("@ChampionshipId", c.Id), ("@Name", t.Name));
                foreach (var playerId in t.Players)
                    Exec(cn, tx, "INSERT INTO dbo.TeamPlayers (TeamId, PlayerId) VALUES (@TeamId,@PlayerId)", ("@TeamId", t.Id), ("@PlayerId", playerId));
            }
        }

        foreach (var p in db.Payments)
            Exec(cn, tx, "INSERT INTO dbo.Payments (Id,PlayerId,Month,Amount,Paid,Date,Confirmed,Method,Note) VALUES (@Id,@PlayerId,@Month,@Amount,@Paid,@Date,@Confirmed,@Method,@Note)",
                ("@Id", p.Id), ("@PlayerId", p.PlayerId), ("@Month", p.Month), ("@Amount", p.Amount), ("@Paid", p.Paid), ("@Date", p.Date), ("@Confirmed", p.Confirmed), ("@Method", p.Method), ("@Note", p.Note));

        foreach (var r in db.Requests)
            Exec(cn, tx, "INSERT INTO dbo.Requests (Id,PlayerId,Type,Version,Size,Date,Status,Note) VALUES (@Id,@PlayerId,@Type,@Version,@Size,@Date,@Status,@Note)",
                ("@Id", r.Id), ("@PlayerId", r.PlayerId), ("@Type", r.Type), ("@Version", r.Version), ("@Size", r.Size), ("@Date", r.Date), ("@Status", r.Status), ("@Note", r.Note));

        tx.Commit();
    }

    private static void Exec(SqlConnection cn, SqlTransaction tx, string sql, params (string Name, object? Value)[] values)
    {
        using var cmd = new SqlCommand(sql, cn, tx);
        foreach (var value in values) cmd.Parameters.AddWithValue(value.Name, value.Value ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    private static string S(SqlDataReader rd, string name) => rd[name] == DBNull.Value ? "" : Convert.ToString(rd[name]) ?? "";
    private static decimal D(SqlDataReader rd, string name) => rd[name] == DBNull.Value ? 0 : Convert.ToDecimal(rd[name]);
    private static bool B(SqlDataReader rd, string name) => rd[name] != DBNull.Value && Convert.ToBoolean(rd[name]);
}
