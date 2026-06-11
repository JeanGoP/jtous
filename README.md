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

- Admin: `admin@tocrown.com` / `Admin123`
- Jugadora: `vale@tocrown.com` / `Vale123`

## Render

El proyecto incluye `Dockerfile` y `render.yaml`. En Render crea un Web Service desde el repositorio y usa Docker. El archivo JSON de datos queda en `/data/database.json` mediante disco persistente.
