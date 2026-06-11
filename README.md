# ToCrown - Gestion Deportiva

Aplicacion ASP.NET Core + frontend HTML/CSS/JS para administrar jugadoras, campeonatos, subequipos, cartera y solicitudes.

## Ejecutar local

```powershell
dotnet run --project src/ToCrown.Api
```

Abrir:

```text
http://localhost:5000
```

Credenciales iniciales:

- Super administrador: `superadmin@tocrown.com` / `qwerty12345`
- Administrador: `admin@tocrown.com` / `qwerty12345`

## SQL Server

Ejecuta el script:

```text
sql/001_create_tocrown.sql
```

Luego configura una de estas variables de entorno:

```text
ConnectionStrings__ToCrownDb=Server=TU_SERVIDOR;Database=ToCrownDb;User Id=TU_USUARIO;Password=TU_PASSWORD;TrustServerCertificate=True;
```

o:

```text
SQLSERVER_CONNECTION_STRING=Server=TU_SERVIDOR;Database=ToCrownDb;User Id=TU_USUARIO;Password=TU_PASSWORD;TrustServerCertificate=True;
```

## Render

El proyecto incluye `Dockerfile` y `render.yaml`. En Render crea un Web Service desde el repositorio y usa Docker. El archivo JSON de datos queda en `/data/database.json` mediante disco persistente.
