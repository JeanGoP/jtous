/* ToCrown SQL Server - reset completo
   Ejecuta este script para borrar y regenerar la base desde cero.
*/
USE master;
GO

IF DB_ID(N'ToCrownDb') IS NOT NULL
BEGIN
    ALTER DATABASE ToCrownDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ToCrownDb;
END
GO

CREATE DATABASE ToCrownDb;
GO

USE ToCrownDb;
GO

CREATE TABLE dbo.Clubs (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Clubs PRIMARY KEY,
    Name NVARCHAR(160) NOT NULL,
    City NVARCHAR(120) NOT NULL,
    MonthlyFee DECIMAL(18,2) NOT NULL
);

CREATE TABLE dbo.Users (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Role NVARCHAR(30) NOT NULL,
    Name NVARCHAR(160) NOT NULL,
    Email NVARCHAR(220) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
    Password NVARCHAR(220) NOT NULL,
    Enabled BIT NOT NULL CONSTRAINT DF_Users_Enabled DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Players (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_Players PRIMARY KEY,
    UserId NVARCHAR(40) NOT NULL CONSTRAINT FK_Players_Users REFERENCES dbo.Users(Id),
    FirstName NVARCHAR(80) NULL,
    SecondName NVARCHAR(80) NULL,
    FirstLastName NVARCHAR(80) NULL,
    SecondLastName NVARCHAR(80) NULL,
    FullName NVARCHAR(180) NOT NULL,
    DocumentType NVARCHAR(20) NOT NULL,
    Document NVARCHAR(60) NOT NULL,
    BirthDate NVARCHAR(20) NULL,
    BirthCity NVARCHAR(120) NULL,
    Sex NVARCHAR(40) NULL,
    JoinDate NVARCHAR(20) NULL,
    City NVARCHAR(120) NULL,
    Phone NVARCHAR(80) NULL,
    Address NVARCHAR(260) NULL,
    Guardian NVARCHAR(160) NULL,
    GuardianPhone NVARCHAR(80) NULL,
    GuardianRelation NVARCHAR(80) NULL,
    Position NVARCHAR(80) NULL,
    SecondaryPosition NVARCHAR(80) NULL,
    Number NVARCHAR(20) NULL,
    Category NVARCHAR(80) NULL,
    Status NVARCHAR(40) NOT NULL,
    Height NVARCHAR(20) NULL,
    Weight NVARCHAR(20) NULL,
    DominantHand NVARCHAR(40) NULL,
    Shirt NVARCHAR(20) NULL,
    Short NVARCHAR(20) NULL,
    Lycra NVARCHAR(20) NULL,
    Jacket NVARCHAR(20) NULL,
    KneePads NVARCHAR(20) NULL,
    Shoes NVARCHAR(20) NULL,
    Blood NVARCHAR(20) NULL,
    Eps NVARCHAR(120) NULL,
    Conditions NVARCHAR(MAX) NULL,
    Allergies NVARCHAR(MAX) NULL,
    Diseases NVARCHAR(MAX) NULL,
    Meds NVARCHAR(MAX) NULL,
    Injuries NVARCHAR(MAX) NULL,
    EmergencyName NVARCHAR(160) NULL,
    EmergencyPhone NVARCHAR(80) NULL,
    EmergencyRelation NVARCHAR(80) NULL,
    Photo NVARCHAR(MAX) NULL,
    IdentityPdf NVARCHAR(MAX) NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Players_CreatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Championships (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_Championships PRIMARY KEY,
    Name NVARCHAR(180) NOT NULL,
    City NVARCHAR(120) NOT NULL,
    Place NVARCHAR(180) NOT NULL,
    Organizer NVARCHAR(180) NOT NULL,
    StartDate NVARCHAR(20) NOT NULL,
    EndDate NVARCHAR(20) NOT NULL,
    Category NVARCHAR(80) NOT NULL,
    Status NVARCHAR(40) NOT NULL,
    TitleWon NVARCHAR(180) NULL,
    Notes NVARCHAR(MAX) NULL
);

CREATE TABLE dbo.ChampionshipTeams (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_ChampionshipTeams PRIMARY KEY,
    ChampionshipId NVARCHAR(40) NOT NULL CONSTRAINT FK_Teams_Championships REFERENCES dbo.Championships(Id) ON DELETE CASCADE,
    Name NVARCHAR(120) NOT NULL
);

CREATE TABLE dbo.TeamPlayers (
    TeamId NVARCHAR(40) NOT NULL CONSTRAINT FK_TeamPlayers_Teams REFERENCES dbo.ChampionshipTeams(Id) ON DELETE CASCADE,
    PlayerId NVARCHAR(40) NOT NULL CONSTRAINT FK_TeamPlayers_Players REFERENCES dbo.Players(Id),
    CONSTRAINT PK_TeamPlayers PRIMARY KEY (TeamId, PlayerId)
);

CREATE TABLE dbo.Payments (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
    PlayerId NVARCHAR(40) NOT NULL CONSTRAINT FK_Payments_Players REFERENCES dbo.Players(Id),
    Month NVARCHAR(80) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Paid DECIMAL(18,2) NOT NULL,
    Date NVARCHAR(20) NOT NULL,
    Confirmed BIT NOT NULL,
    Method NVARCHAR(80) NULL,
    Note NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Requests (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_Requests PRIMARY KEY,
    PlayerId NVARCHAR(40) NOT NULL CONSTRAINT FK_Requests_Players REFERENCES dbo.Players(Id),
    Type NVARCHAR(80) NOT NULL,
    Version NVARCHAR(160) NOT NULL,
    Size NVARCHAR(40) NULL,
    Date NVARCHAR(20) NOT NULL,
    Status NVARCHAR(60) NOT NULL,
    Note NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Requests_CreatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.News (
    Id NVARCHAR(40) NOT NULL CONSTRAINT PK_News PRIMARY KEY,
    Title NVARCHAR(180) NOT NULL,
    Body NVARCHAR(MAX) NULL,
    Image NVARCHAR(MAX) NULL,
    Date NVARCHAR(20) NULL,
    Active BIT NOT NULL CONSTRAINT DF_News_Active DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_News_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

CREATE OR ALTER VIEW dbo.vw_PlayerWallet AS
SELECT p.Id AS PlayerId, p.FullName,
       SUM(CASE WHEN pay.Amount - pay.Paid > 0 THEN pay.Amount - pay.Paid ELSE 0 END) AS PendingAmount,
       SUM(pay.Paid) AS PaidAmount
FROM dbo.Players p
LEFT JOIN dbo.Payments pay ON pay.PlayerId = p.Id
GROUP BY p.Id, p.FullName;
GO

CREATE OR ALTER VIEW dbo.vw_ChampionshipRoster AS
SELECT c.Id AS ChampionshipId, c.Name AS ChampionshipName, c.City, c.Place, c.Organizer,
       t.Id AS TeamId, t.Name AS TeamName, p.Id AS PlayerId, p.FullName, p.Position, p.Number
FROM dbo.Championships c
JOIN dbo.ChampionshipTeams t ON t.ChampionshipId = c.Id
LEFT JOIN dbo.TeamPlayers tp ON tp.TeamId = t.Id
LEFT JOIN dbo.Players p ON p.Id = tp.PlayerId;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GenerateMonthlyWallet
    @Month NVARCHAR(80),
    @DefaultAmount DECIMAL(18,2),
    @ExceptPlayerIds NVARCHAR(MAX) = N'',
    @OverridesJson NVARCHAR(MAX) = N'[]'
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH OverrideValues AS (
        SELECT PlayerId, Amount
        FROM OPENJSON(@OverridesJson)
        WITH (PlayerId NVARCHAR(40) '$.playerId', Amount DECIMAL(18,2) '$.amount')
    )
    INSERT INTO dbo.Payments (Id, PlayerId, Month, Amount, Paid, Date, Confirmed, Method, Note)
    SELECT REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), p.Id, @Month,
           COALESCE(o.Amount, @DefaultAmount), 0, CONVERT(NVARCHAR(10), GETDATE(), 23),
           0, N'Pendiente', N'Cartera generada mensual'
    FROM dbo.Players p
    JOIN dbo.Users u ON u.Id = p.UserId AND u.Enabled = 1
    LEFT JOIN OverrideValues o ON o.PlayerId = p.Id
    WHERE p.Status <> N'Inactiva'
      AND NOT EXISTS (SELECT 1 FROM STRING_SPLIT(@ExceptPlayerIds, ',') x WHERE LTRIM(RTRIM(x.value)) = p.Id)
      AND NOT EXISTS (SELECT 1 FROM dbo.Payments existing WHERE existing.PlayerId = p.Id AND existing.Month = @Month);
END
GO

INSERT INTO dbo.Clubs (Name, City, MonthlyFee)
VALUES (N'ToCrown Volleyball', N'Bogota', 85000);

INSERT INTO dbo.Users (Id, Role, Name, Email, Password, Enabled)
VALUES
(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), N'superadmin', N'Super Administrador', N'superadmin@tocrown.com', N'qwerty12345', 1),
(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), N'admin', N'Administrador ToCrown', N'admin@tocrown.com', N'qwerty12345', 1);

INSERT INTO dbo.News (Id, Title, Body, Date, Active)
VALUES (REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), N'Bienvenidas a ToCrown', N'Noticias, cumpleanos, campeonatos y logros del club en un solo lugar.', CONVERT(NVARCHAR(10), GETDATE(), 23), 1);
GO
