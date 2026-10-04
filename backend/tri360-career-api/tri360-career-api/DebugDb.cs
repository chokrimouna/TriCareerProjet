
using Microsoft.EntityFrameworkCore;
using Quizback.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

public class DebugDb
{
    private readonly TriCareerContext _context;
    public DebugDb(TriCareerContext context) { _context = context; }

    public async Task Run(int appId)
    {
        Console.WriteLine($"--- Debugging Sessions for AppId {appId} ---");
        var allSessions = await _context.Sessions.ToListAsync();
        Console.WriteLine($"Total sessions in DB: {allSessions.Count}");
        
        var appSessions = allSessions.Where(s => s.ApplicationId == appId).ToList();
        Console.WriteLine($"Sessions with ApplicationId {appId}: {appSessions.Count}");
        
        var recProcesses = await _context.RecruitementProcesses.Where(rp => rp.ApplicationId == appId).ToListAsync();
        var rpIds = recProcesses.Select(rp => rp.RecruitementProcessId).ToList();
        Console.WriteLine($"RecruitmentProcesses for AppId {appId}: {string.Join(", ", rpIds)}");
        
        var rpSessions = allSessions.Where(s => s.RecruitementProcessId.HasValue && rpIds.Contains(s.RecruitementProcessId.Value)).ToList();
        Console.WriteLine($"Sessions linked via RecruitmentProcess: {rpSessions.Count}");
        
        foreach(var s in allSessions.Take(5)) {
            Console.WriteLine($"Session {s.SessionId}: AppId={s.ApplicationId}, RPId={s.RecruitementProcessId}");
        }
    }
}
