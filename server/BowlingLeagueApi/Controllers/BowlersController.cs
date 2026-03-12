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

        return await (
            from bowler in _context.Bowlers
            join team in _context.Teams on bowler.TeamId equals team.TeamId
            where allowedTeams.Contains(team.TeamName)
            orderby team.TeamName, bowler.BowlerLastName, bowler.BowlerFirstName
            select new BowlerDto
            {
                FirstName = bowler.BowlerFirstName,
                MiddleInit = bowler.BowlerMiddleInit,
                LastName = bowler.BowlerLastName,
                TeamName = team.TeamName,
                Address = bowler.BowlerAddress,
                City = bowler.BowlerCity,
                State = bowler.BowlerState,
                Zip = bowler.BowlerZip,
                PhoneNumber = bowler.BowlerPhoneNumber
            }
        ).ToListAsync();
    }
}

