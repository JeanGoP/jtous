FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/ToCrown.Api/ToCrown.Api.csproj src/ToCrown.Api/
RUN dotnet restore src/ToCrown.Api/ToCrown.Api.csproj
COPY src/ToCrown.Api src/ToCrown.Api
RUN dotnet publish src/ToCrown.Api/ToCrown.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
ENV TOCROWN_DB_PATH=/tmp/tocrown/database.json
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ToCrown.Api.dll"]
