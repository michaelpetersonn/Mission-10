# Mission #10 — Step-by-step Guide (React + ASP.NET Core API + SQLite)

This guide matches the **Mission #10 Assignment** PDF requirements and your provided `BowlingLeague.sqlite`.

## What you’re building

- A **React** web page with:
  - A **heading component** describing the page
  - A **table component** listing bowlers
  - Both used in `App`
- An **ASP.NET Core Web API** that React calls to get data from `BowlingLeague.sqlite`
- The UI must display (per bowler):
  - Bowler Name (First, Middle, Last)
  - Team Name
  - Address, City, State, Zip
  - Phone Number
- **Only show bowlers** whose team is **Marlins** or **Sharks**

## Prereqs

- .NET SDK (recommend .NET 8)
- Node.js (recommend 18+)
- `dotnet-ef` tool

Install EF tool (once):

```bash
dotnet tool install --global dotnet-ef
```

---

# Part 1 — Create the solution structure

From `/Users/michaelpeterson/Mission 10`:

```bash
mkdir server client
```

## 1A) Create the ASP.NET Core Web API (server)

```bash
cd server
dotnet new webapi -n BowlingLeagueApi
cd BowlingLeagueApi
```

Run it once to confirm:

```bash
dotnet run
```

---

# Part 2 — Add EF Core + scaffold models from `BowlingLeague.sqlite`

## 2A) Add EF Core packages

```bash
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

## 2B) Copy the database into the API project

Copy your DB file next to `Program.cs`:

```bash
cp ../../BowlingLeague.sqlite .
```

## 2C) Scaffold the DbContext + Models

From inside `server/BowlingLeagueApi/BowlingLeagueApi`:

```bash
dotnet ef dbcontext scaffold "Data Source=BowlingLeague.sqlite" Microsoft.EntityFrameworkCore.Sqlite \
  -o Models -c BowlingLeagueContext -f
```

What you should see created:

- `Models/BowlingLeagueContext.cs`
- `Models/Bowler.cs`
- `Models/Team.cs`
- (and other tables you won’t necessarily use)

---

# Part 3 — Configure the API (DbContext + CORS)

## 3A) Register `BowlingLeagueContext` in `Program.cs`

In `server/BowlingLeagueApi/BowlingLeagueApi/Program.cs`, add:

- `builder.Services.AddDbContext<BowlingLeagueContext>(...)` with the SQLite connection string:
  - `Data Source=BowlingLeague.sqlite`

Recommended: put the connection string in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "BowlingLeague": "Data Source=BowlingLeague.sqlite"
  }
}
```

Then in `Program.cs` (adjust namespace if your project differs):

```csharp
using BowlingLeagueApi.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<BowlingLeagueContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("BowlingLeague")));
```

## 3B) Add CORS so React can call the API during dev

Still in `Program.cs`, add a CORS policy to allow your React dev server, typically:

- `http://localhost:5173` (Vite default)

Then enable it with `app.UseCors(...)`.

Copy/paste example:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowReact");
app.MapControllers();
app.Run();
```

---

# Part 4 — Create the API endpoint React will call

## 4A) Create a DTO (recommended)

Create `Dtos/BowlerDto.cs` with fields the UI needs:

- `firstName`, `middleInit`, `lastName`
- `teamName`
- `address`, `city`, `state`, `zip`
- `phoneNumber`

Example `Dtos/BowlerDto.cs`:

```csharp
namespace BowlingLeagueApi.Dtos;

public class BowlerDto
{
    public string? FirstName { get; set; }
    public string? MiddleInit { get; set; }
    public string? LastName { get; set; }
    public string? TeamName { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Zip { get; set; }
    public string? PhoneNumber { get; set; }
}
```

## 4B) Create the controller

Create `Controllers/BowlersController.cs` with a GET endpoint:

- Route: `GET /api/bowlers`
- Query:
  - Join `Bowlers` to `Teams` using `TeamID`
  - Filter to team names: `Marlins` or `Sharks`
  - Project into `BowlerDto`

Example `Controllers/BowlersController.cs` (LINQ join style, works even if navigation props aren’t present):

```csharp
using BowlingLeagueApi.Dtos;
using BowlingLeagueApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BowlingLeagueApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BowlersController : ControllerBase
{
    private readonly BowlingLeagueContext _context;

    public BowlersController(BowlingLeagueContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<List<BowlerDto>> Get()
    {
        var allowedTeams = new[] { "Marlins", "Sharks" };

        return await (from b in _context.Bowlers
                      join t in _context.Teams on b.TeamId equals t.TeamId
                      where allowedTeams.Contains(t.TeamName)
                      orderby t.TeamName, b.BowlerLastName, b.BowlerFirstName
                      select new BowlerDto
                      {
                          FirstName = b.BowlerFirstName,
                          MiddleInit = b.BowlerMiddleInit,
                          LastName = b.BowlerLastName,
                          TeamName = t.TeamName,
                          Address = b.BowlerAddress,
                          City = b.BowlerCity,
                          State = b.BowlerState,
                          Zip = b.BowlerZip,
                          PhoneNumber = b.BowlerPhoneNumber
                      }).ToListAsync();
    }
}
```

SQL conceptually looks like:

```sql
SELECT ...
FROM Bowlers b
JOIN Teams t ON b.TeamID = t.TeamID
WHERE t.TeamName IN ('Marlins', 'Sharks');
```

## 4C) Quick test the endpoint

Run the API:

```bash
dotnet run
```

Then in another terminal (adjust port if needed):

```bash
curl http://localhost:5000/api/bowlers
```

You should receive JSON objects with the exact fields your React app will display.

---

# Part 5 — Create the React app (client)

From `/Users/michaelpeterson/Mission 10`:

```bash
cd client
npm create vite@latest bowling-league-ui -- --template react
cd bowling-league-ui
npm install
```

## 5A) Configure a dev proxy to the API

Edit `client/bowling-league-ui/vite.config.js` to proxy `/api` to your ASP.NET API, e.g.:

- `http://localhost:5000`

This lets React call `/api/bowlers` without hardcoding full URLs.

Example `vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
```

---

# Part 6 — Build the required React components

## 6A) Create the heading component

Create something like:

- `src/components/Heading.jsx`

It should explain what the page is (ex: “Bowling League — Marlins & Sharks Bowlers”).

## 6B) Create the table component

Create something like:

- `src/components/BowlerTable.jsx`

It should:

- Fetch from `GET /api/bowlers`
- Store results in state
- Render a table with:
  - Name (First Middle Last)
  - Team
  - Address (or separate columns: Address, City, State, Zip)
  - Phone

Minimal fetch pattern:

```js
useEffect(() => {
  fetch("/api/bowlers")
    .then((r) => r.json())
    .then(setBowlers);
}, []);
```

## 6C) Use both components in `App.jsx`

In `src/App.jsx`, render:

- `<Heading />`
- `<BowlerTable />`

---

# Part 7 — Run and verify

## 7A) Run the API

In `server/BowlingLeagueApi/BowlingLeagueApi`:

```bash
dotnet watch run
```

## 7B) Run React

In `client/bowling-league-ui`:

```bash
npm run dev
```

## 7C) Verify the rubric items

- Page shows a heading describing the page
- Table shows only **Marlins** and **Sharks** bowlers
- All required fields show correctly:
  - First/Middle/Last
  - Team Name
  - Address, City, State, Zip
  - Phone Number

---

# Part 8 — Publish to GitHub (PUBLIC) and submit

From `/Users/michaelpeterson/Mission 10`:

```bash
git init
git add .
git commit -m "Mission 10"
```

Create a GitHub repo (public), add the remote, and push:

```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

Submit your **PUBLIC GitHub link** in Learning Suite.

---

## Notes about your database schema (for your query)

Your DB has:

- `Bowlers` table with `TeamID`
- `Teams` table with `TeamID`, `TeamName`

So the filter is done via `Teams.TeamName == "Marlins" || "Sharks"`.
