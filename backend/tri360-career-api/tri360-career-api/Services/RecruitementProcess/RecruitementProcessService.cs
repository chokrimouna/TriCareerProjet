using Microsoft.EntityFrameworkCore;
using Quizback.Models;
using QuizBack.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Quizback.Dto;
using QuizBack.utils;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;

namespace Quizback.Services
{
    public class RecruitementProcessService : IRecruitementProcessService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly IEmailService _emailService;
        private readonly IGoogleCalendarService _googleCalendarService;
        private readonly string _connectionString;
private readonly IWherebyService _wherebyService;
        public RecruitementProcessService(
            TriCareerContext context,
            IConfiguration configuration,
            IEmailService emailService,
            IGoogleCalendarService googleCalendarService,
            IWherebyService wherebyService)
        {
            _quizDbContext = context;
            _emailService = emailService;
            _googleCalendarService = googleCalendarService;
            _wherebyService = wherebyService;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;

            // Ensure database columns exist (Simple Migration)
            Task.Run(async () => {
                try {
                    using (var connection = new SqlConnection(_connectionString)) {
                        await connection.OpenAsync();
                        string[] columns = { "HostMeetLink", "MeetingProvider", "ExternalMeetingId" };
                        foreach (var col in columns) {
                            try {
                                string sql = $"IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RecruitementProcess' AND COLUMN_NAME = '{col}') BEGIN ALTER TABLE RecruitementProcess ADD {col} NVARCHAR(MAX) NULL END";
                                using (var cmd = new SqlCommand(sql, connection)) {
                                    await cmd.ExecuteNonQueryAsync();
                                }
                            } catch { }
                        }
                    }
                } catch (Exception ex) {
                    Console.WriteLine($"[DB Migration Error] {ex.Message}");
                }
            });
        }

        public async Task<string> AddRecruitementProcess(recruitementProcessWithIdExamen RpIde)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                string EncryptedSessinId = "";
                if (RpIde == null)
                {
                    // Gérer la situation où le processus de recrutement est nul
                    return "";
                }

                RecruitementProcess recruitementProcess = RpIde.recruitementProcess;
                
                // 1. Fetch Application to get candidate info for meeting title and email
                var application = await _quizDbContext.Applications
                    .Include(a => a.JobPosting)
                    .FirstOrDefaultAsync(a => a.ApplicationId == recruitementProcess.ApplicationId);

                if (application == null)
                {
                    return "Application non trouvée";
                }

                // 2. Handle Video Meeting Generation if it's an interview
                Console.WriteLine($"[Process Debug] AddRecruitementProcess for App: {application.ApplicationId}, ExamId: {RpIde.IdExamen}");
                
                if (RpIde.IdExamen == null || RpIde.IdExamen == 0)
                {
                    // Limit to 3 interviews
                    var interviewCount = await _quizDbContext.RecruitementProcesses
                        .CountAsync(rp => rp.ApplicationId == recruitementProcess.ApplicationId && (rp.Sessions == null || !rp.Sessions.Any()));
                    // Note: This logic depends on how you define 'interview' vs 'test' in the DB.
                    // If IdExamen is 0, it's usually an interview.
                    
                    if (interviewCount >= 3)
                    {
                        return "Limite de 3 entretiens atteinte pour ce candidat.";
                    }

                    if (recruitementProcess.DatePlanification.HasValue)
                    {
                        string currentMeetLink = recruitementProcess.MeetLink ?? "";
                        Console.WriteLine($"[Process Debug] Date: {recruitementProcess.DatePlanification}, CurrentLink: '{currentMeetLink}'");

                        if (string.IsNullOrWhiteSpace(currentMeetLink) || currentMeetLink.Contains("google.com/meet") || (currentMeetLink.Contains("whereby.com") && string.IsNullOrWhiteSpace(recruitementProcess.HostMeetLink)))
                        {
                            try
                            {
                                Console.WriteLine($"[Whereby Debug] Attempting to create/fix meeting for: {application.NameApplication}");
                                var meeting = await _wherebyService.CreateMeetingAsync(
                                    $"Entretien - {application.NameApplication} - {application.JobPosting?.PositionTitle ?? "Poste"}",
                                    recruitementProcess.DatePlanification.Value,
                                    recruitementProcess.DatePlanification.Value.AddHours(1)
                                );

                                if (meeting != null && !string.IsNullOrWhiteSpace(meeting.RoomUrl))
                                {
                                    Console.WriteLine($"[Whereby Debug] Success: {meeting.RoomUrl}");
                                    recruitementProcess.MeetLink = meeting.RoomUrl;
                                    recruitementProcess.HostMeetLink = meeting.HostRoomUrl;
                                    recruitementProcess.MeetingProvider = "Whereby";
                                    recruitementProcess.ExternalMeetingId = meeting.MeetingId;
                                }
                                else
                                {
                                    Console.WriteLine("[Whereby Debug] Failed: Meeting result is null or empty RoomUrl");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[Whereby Error] {ex.Message}");
                            }
                        }
                    }
                    else
                    {
                        Console.WriteLine("[Process Debug] No DatePlanification provided, skipping meeting generation.");
                    }
                }

                // 3. Save RecruitementProcess
                await _quizDbContext.RecruitementProcesses.AddAsync(recruitementProcess);
                await _quizDbContext.SaveChangesAsync();

                // 4. Handle Exam/Session if provided
                if (RpIde.IdExamen != null && RpIde.IdExamen != 0)
                {
                    var sessiondata = new Session
                    {
                        EncryptedSessinId = null,
                        ExamnId = RpIde.IdExamen,
                        ApplicationId = recruitementProcess.ApplicationId,
                        CreatedAt = DateTime.UtcNow,
                        ExpiresAt = DateTime.UtcNow.AddDays(1),
                        RecruitementProcessId = recruitementProcess.RecruitementProcessId,
                        SessionState = true 
                    };
                    await _quizDbContext.Sessions.AddAsync(sessiondata);
                    await _quizDbContext.SaveChangesAsync();
                    
                    EncryptedSessinId = Crytage.Crypt(sessiondata.SessionId.ToString());
                    sessiondata.EncryptedSessinId = EncryptedSessinId;
                    await _quizDbContext.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                // Auto-refresh score after adding process
                if (recruitementProcess.ApplicationId.HasValue)
                {
                    await RefreshApplicationScore(recruitementProcess.ApplicationId.Value);
                }

                // 5. Send Email Invitation
                try
                {
                    if (RpIde.IdExamen != null && RpIde.IdExamen != 0)
                    {
                        var exam = await _quizDbContext.Examen.FindAsync(RpIde.IdExamen);
                        var examUrl = $"http://localhost:5174/exam/{EncryptedSessinId}";
                        await _emailService.SendTestInvitation(application.Email, application.NameApplication, exam?.Titre ?? "Test Technique", examUrl);
                    }
                    else if (recruitementProcess.DatePlanification.HasValue)
                    {
                        string finalMeetLink = recruitementProcess.MeetLink;
                        if (string.IsNullOrWhiteSpace(finalMeetLink))
                        {
                            finalMeetLink = "Lien de visio disponible sur votre tableau de bord";
                        }

                        Console.WriteLine($"[Email Debug] Sending invitation for application {application.ApplicationId} with link: {finalMeetLink}");

                        await _emailService.SendInterviewInvitation(
                            application.Email, 
                            application.NameApplication, 
                            application.JobPosting?.PositionTitle ?? "Entretien", 
                            recruitementProcess.DatePlanification.Value, 
                            finalMeetLink
                        );
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Email Error] {ex.Message}");
                }

                return "Success";
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "AddRecruitementProcess");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return "";
            }
        }
        public async Task DeleteRecruitementProcess(int Id)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                var recruitementProcess = await _quizDbContext.RecruitementProcesses
                    .Include(rp => rp.Timelines)
                    .Include(rp => rp.Comments)
                    .Include(rp => rp.Sessions).ThenInclude(s => s.ReponseValues).ThenInclude(r => r.ReponseDetails)
                    .FirstOrDefaultAsync(rp => rp.RecruitementProcessId == Id);

                if (recruitementProcess != null)
                {
                    // Remove related entities first to avoid FK constraints
                    if (recruitementProcess.Timelines != null && recruitementProcess.Timelines.Any())
                        _quizDbContext.Timelines.RemoveRange(recruitementProcess.Timelines);

                    if (recruitementProcess.Comments != null && recruitementProcess.Comments.Any())
                        _quizDbContext.Comments.RemoveRange(recruitementProcess.Comments);

                    // Purge TestChecklist (table réelle non mappée dans le DbContext EF, cf.
                    // ApplicationService.DeleteApplication) avant de supprimer les sessions liées
                    // (FK Session, NO_ACTION) — sinon la suppression de l'entretien échoue (500)
                    // dès qu'une session liée a une checklist de test.
                    var sessionIds = recruitementProcess.Sessions.Select(s => s.SessionId).ToList();
                    if (sessionIds.Count > 0)
                    {
                        var idList = string.Join(",", sessionIds);
                        await _quizDbContext.Database.ExecuteSqlRawAsync(
                            $"DELETE FROM TestChecklist WHERE SessionId IN ({idList})");
                    }

                    foreach (var s in recruitementProcess.Sessions)
                    {
                        foreach (var r in s.ReponseValues)
                            _quizDbContext.ReponseDetails.RemoveRange(r.ReponseDetails);
                        _quizDbContext.ReponseValues.RemoveRange(s.ReponseValues);
                    }

                    if (recruitementProcess.Sessions != null && recruitementProcess.Sessions.Any())
                        _quizDbContext.Sessions.RemoveRange(recruitementProcess.Sessions);

                    _quizDbContext.RecruitementProcesses.Remove(recruitementProcess);
                    await _quizDbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "DeleteRecruitementProcess");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }

        public async Task UpdateRecruitementProcess(RecruitementProcess RecruitementProcess)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (RecruitementProcess != null)
                {
                    var existingProcess = await _quizDbContext.RecruitementProcesses
                        .FirstOrDefaultAsync(p => p.RecruitementProcessId == RecruitementProcess.RecruitementProcessId);

                    if (existingProcess != null)
                    {
                        // Update only the scalar fields that can be modified
                        if (RecruitementProcess.EvaNote.HasValue)
                            existingProcess.EvaNote = RecruitementProcess.EvaNote;
                        if (!string.IsNullOrEmpty(RecruitementProcess.EvaCommentaire))
                            existingProcess.EvaCommentaire = RecruitementProcess.EvaCommentaire;
                        if (RecruitementProcess.IdStatus.HasValue)
                            existingProcess.IdStatus = RecruitementProcess.IdStatus;
                        if (RecruitementProcess.DatePlanification.HasValue)
                            existingProcess.DatePlanification = RecruitementProcess.DatePlanification;
                        if (RecruitementProcess.IdPosition.HasValue)
                            existingProcess.IdPosition = RecruitementProcess.IdPosition;
                        if (!string.IsNullOrEmpty(RecruitementProcess.MeetLink))
                            existingProcess.MeetLink = RecruitementProcess.MeetLink;
                        
                        // Auto-generate Whereby link if missing or old Google link
                        if (string.IsNullOrWhiteSpace(existingProcess.MeetLink) || existingProcess.MeetLink.Contains("google.com/meet") || (existingProcess.MeetLink.Contains("whereby.com") && string.IsNullOrWhiteSpace(existingProcess.HostMeetLink)))
                        {
                            try
                            {
                                var application = await _quizDbContext.Applications
                                    .Include(a => a.JobPosting)
                                    .FirstOrDefaultAsync(a => a.ApplicationId == existingProcess.ApplicationId);
                                
                                if (application != null && existingProcess.DatePlanification.HasValue)
                                {
                                    var meeting = await _wherebyService.CreateMeetingAsync(
                                        $"Entretien - {application.NameApplication}",
                                        existingProcess.DatePlanification.Value,
                                        existingProcess.DatePlanification.Value.AddHours(1)
                                    );

                                    if (meeting != null)
                                    {
                                        existingProcess.MeetLink = meeting.RoomUrl;
                                        existingProcess.HostMeetLink = meeting.HostRoomUrl;
                                        existingProcess.MeetingProvider = "Whereby";
                                        existingProcess.ExternalMeetingId = meeting.MeetingId;
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[Whereby Update Error] {ex.Message}");
                            }
                        }

                        if (!string.IsNullOrEmpty(RecruitementProcess.HostMeetLink))
                            existingProcess.HostMeetLink = RecruitementProcess.HostMeetLink;

                        if (!string.IsNullOrEmpty(RecruitementProcess.MeetingProvider))
                            existingProcess.MeetingProvider = RecruitementProcess.MeetingProvider;

if (!string.IsNullOrEmpty(RecruitementProcess.ExternalMeetingId))
    existingProcess.ExternalMeetingId = RecruitementProcess.ExternalMeetingId;
                            
                        _quizDbContext.RecruitementProcesses.Update(existingProcess);
                        await _quizDbContext.SaveChangesAsync();
                        
                        if (existingProcess.ApplicationId.HasValue)
                        {
                            await RefreshApplicationScore(existingProcess.ApplicationId.Value);
                        }

                        await transaction.CommitAsync();
                    }
                }
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "UpdateRecruitementProcess");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }

        public async Task<RecruitementProcess?> GetRecruitementProcessByID(int Id)
        {
            try
            {
                RecruitementProcess? recruitementProcess = new RecruitementProcess();
                recruitementProcess = await _quizDbContext.RecruitementProcesses
                    //.Include(c => c.Comments)
                    .Include(a => a.User)
                    .Include(l => l.Application)
                    .Include(n => n.Timelines)
                    //.Include(c => c.Comments)
                    .FirstOrDefaultAsync(u => u.RecruitementProcessId == Id);

                //recruitementProcess = await _quizDbContext.RecruitementProcesses.FindAsync(Id);
                //recruitementProcess!.IdStatusNavigation = await _quizDbContext.Statuses.FindAsync(recruitementProcess.IdStatus);

                return recruitementProcess;
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetRecruitementProcessByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<List<RecruitementProcess>?> GetRecruitementProcessByApplicationID(int idApplication)
        {
            try
            {


                return await _quizDbContext.RecruitementProcesses
                    .Include(a => a.User)
                    .Include(l => l.Application)
                    .Include(n => n.IdPositionNavigation)
                    .Include(n => n.IdStatusNavigation)

                    .Where(u => u.ApplicationId == idApplication).ToListAsync();
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetRecruitementProcessByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<List<RecruitementProcess>?> GetRecruitementProcessByAppId(int appId)
        {
            try
            {
               

                List<RecruitementProcess> lrecruitementProcess = new List<RecruitementProcess>();
                lrecruitementProcess = await _quizDbContext.RecruitementProcesses
                    .Where(u => u.ApplicationId == appId)
                    .Select(x => new RecruitementProcess()
                {
                    RecruitementProcessId = x.RecruitementProcessId,
                    ApplicationId = x.ApplicationId,
                    Application = x.Application,
                    IdPositionNavigation = x.IdPositionNavigation,
                    IdStatusNavigation = x.IdStatusNavigation,
                    User = x.User,
                    DatePlanification = x.DatePlanification,
                    IdPosition = x.IdPosition,
                    IdStatus = x.IdStatus,
                    UserId = x.UserId,
                    MeetLink = x.MeetLink,
HostMeetLink = x.HostMeetLink,
MeetingProvider = x.MeetingProvider,
ExternalMeetingId = x.ExternalMeetingId


                }).ToListAsync();

               
                //recruitementProcess =  await _quizDbContext.RecruitementProcesses
                //   .Include(x => x.IdPositionNavigation)
                //   .Include(x => x.IdStatusNavigation)
                //   .Include(x => x.Application)
                //   .Include(x => x.Comments)
                //   .Include(x => x.IdStatusNavigation)
                //   .Include(x => x.Timelines)
                //   .Include(x => x.User)
                //  
                //   .ToListAsync();

                return lrecruitementProcess;
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetRecruitementProcessByAppId");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<List<RecruitementProcess>?> GetRecruitementProcesss(int? departmentId = null, int? userId = null)
        {
            try
            {
                var query = _quizDbContext.RecruitementProcesses.AsQueryable();

                Console.WriteLine($"GetRecruitementProcesss called with dept: {departmentId}, user: {userId}");
                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    // TL can see their own OR any interview in their department
                    query = query.Where(x => 
                        (x.UserId == userId) || 
                        (x.Application != null && x.Application.JobPosting != null && x.Application.JobPosting.DepartmentId == departmentId.Value)
                    );
                }
                else if (userId.HasValue)
                {
                    // Candidate sees only their own
                    // We also check by email to be safe if UserId isn't linked yet on the application
                    var user = await _quizDbContext.Users.FindAsync(userId.Value);
                    string userEmail = user?.Email ?? "";

                    query = query.Where(x => 
                        x.UserId == userId || 
                        (x.Application != null && (x.Application.UserId == userId || (userEmail != "" && x.Application.Email == userEmail)))
                    );
                }

                List<RecruitementProcess> lrecruitementProcess = await query
                    .Include(x => x.IdPositionNavigation)
                    .Include(x => x.IdStatusNavigation)
                    .Include(x => x.User)
                    .Include(x => x.Application)
                        .ThenInclude(a => a.JobPosting)
                    .Where(x => x.DatePlanification.HasValue)
                    .OrderByDescending(x => x.DatePlanification.Value.Date == DateTime.Today)
                    .ThenBy(x => x.DatePlanification)
                    .Select(x => new RecruitementProcess()
                    {
                        RecruitementProcessId = x.RecruitementProcessId,
                        ApplicationId = x.ApplicationId,
                        Application = x.Application != null ? new Application()
                        {
                            ApplicationId = x.Application.ApplicationId,
                            NameApplication = x.Application.NameApplication,
                            Email = x.Application.Email,
                            JobPosting = x.Application.JobPosting != null ? new JobPosting()
                            {
                                JobPostingId = x.Application.JobPosting.JobPostingId,
                                PositionTitle = x.Application.JobPosting.PositionTitle,
                                DepartmentId = x.Application.JobPosting.DepartmentId
                            } : null
                        } : null,
                        IdPositionNavigation = x.IdPositionNavigation != null ? new Pipline()
                        {
                            Id = x.IdPositionNavigation.Id,
                            NamePipline = x.IdPositionNavigation.NamePipline
                        } : null,
                        IdStatusNavigation = x.IdStatusNavigation != null ? new Status()
                        {
                            IdStatus = x.IdStatusNavigation.IdStatus,
                            NameStatus = x.IdStatusNavigation.NameStatus,
                            ColorS = x.IdStatusNavigation.ColorS
                        } : null,
                        User = x.User != null ? new User()
                        {
                            UserId = x.User.UserId,
                            Name = x.User.Name,
                            Prename = x.User.Prename
                        } : null,
                        DatePlanification = x.DatePlanification,
                        IdPosition = x.IdPosition,
                        IdStatus = x.IdStatus,
                        UserId = x.UserId,
                        Sessions = x.Sessions,
                        EvaNote = x.EvaNote,
                        EvaCommentaire = x.EvaCommentaire,
                        MeetLink = x.MeetLink,
HostMeetLink = x.HostMeetLink,
MeetingProvider = x.MeetingProvider,
ExternalMeetingId = x.ExternalMeetingId
                    })
                    .ToListAsync();

                return lrecruitementProcess;
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetRecruitementProcesss");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<List<RecruitementProcess>?> GetDataDashboard()
        {
            try
            {
                // Logique pour récupérer les données du tableau de bord
                return null; // Retourner null pour l'exemple
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetDataDashboard");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        async Task<RecruitementProcess?> IRecruitementProcessService.GetRecruitementProcessByUserId(int userId, int status)
        {
            try
            {
                return await _quizDbContext.RecruitementProcesses
                    .Include(x => x.IdPositionNavigation)
                    .Include(x => x.IdStatusNavigation)
                    .Include(x => x.Application)
                    //.Include(x => x.Comments)
                    .Include(x => x.IdStatusNavigation)
                    .Include(x => x.Timelines)
                    .Include(x => x.User)
                    .Where(u => u.UserId == userId && u.IdStatus == status)
                    .FirstOrDefaultAsync();
            }
            catch (Exception e)
            {
                // Gérer l'exception et enregistrer les détails dans la base de données
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "GetRecruitementProcessByUserId");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<RecruitementProcess?> UpdateRecruitementProcessstatut(UpdateStatusDto UpdateStatusDto)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                RecruitementProcess? recruitementProcess = await _quizDbContext.RecruitementProcesses.FindAsync(UpdateStatusDto.RecId);
                if (recruitementProcess != null)
                {
                    recruitementProcess.IdStatus = UpdateStatusDto.Status;
                    recruitementProcess.Final = UpdateStatusDto.Final;
                    _quizDbContext.RecruitementProcesses.Update(recruitementProcess);
                    await _quizDbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return recruitementProcess;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                // Handle the exception and save details to the database
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RecruitementProcessService", "UpdateRecruitementProcessstatut");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }
        public async Task<RecruitementProcess?> GetLastRecruitementProcessStatusByIDApp(int Id)
        {
            await using var transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                RecruitementProcess? rec = await _quizDbContext.RecruitementProcesses
                .Where(R => R.ApplicationId == Id)
                .OrderByDescending(x => x.RecruitementProcessId)
                .FirstOrDefaultAsync();

                return rec;
                
            }
            catch (System.Exception)
            {
                
                throw;
            }
            
        }
        public async Task EditDateRecProcess(RecProcessDTO RecruitementProcess)
        {
            using var transaction =_quizDbContext.Database.BeginTransaction();

            try
            {
                if(RecruitementProcess == null){
                    throw new Exception("null value");
                }

                RecruitementProcess? rec = await _quizDbContext.RecruitementProcesses.FirstOrDefaultAsync(r => r.RecruitementProcessId == RecruitementProcess.RecruitementProcessId);
                
                if(rec == null){
                    throw new Exception("null rec process");
                }

                rec.DatePlanification = RecruitementProcess.DatePlanification;

                _quizDbContext.RecruitementProcesses.Update(rec);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception e)
            {
                
                throw new Exception("error : " + e);
            }
        }

        public async Task RefreshApplicationScore(int applicationId)
        {
            var application = await _quizDbContext.Applications
                .Include(a => a.RecruitementProcesses)
                .Include(a => a.Sessions)
                .Include(a => a.AiResults)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null) return;

            // 1. CV Matching score from AI Results
            double? cvScore = null;
            
            // Try fetching directly from DB to be 100% sure we have the latest data
            var latestAiResult = await _quizDbContext.AiResults
                .Where(ar => ar.ApplicationId == applicationId)
                .OrderByDescending(ar => ar.IdResultAi)
                .FirstOrDefaultAsync();

            if (latestAiResult != null && !string.IsNullOrEmpty(latestAiResult.Result))
            {
                var match = System.Text.RegularExpressions.Regex.Match(latestAiResult.Result, @"\d+([.,]\d+)?");
                if (match.Success)
                {
                    var val = match.Value.Replace(',', '.');
                    if (double.TryParse(val, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var score))
                    {
                        if (score > 100.0 && score < 10000.0) score = score / 100.0;
                        else if (score >= 10000.0) score = 100.0;
                        cvScore = score;
                    }
                }
                
                if (!cvScore.HasValue)
                {
                    var numericPart = new string(latestAiResult.Result.Where(c => char.IsDigit(c) || c == '.').ToArray());
                    if (double.TryParse(numericPart, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var score))
                    {
                        if (score > 100.0 && score < 10000.0) score = score / 100.0;
                        cvScore = score;
                    }
                }
            }
            
            Console.WriteLine($"[RefreshApplicationScore] AppId={applicationId} Parsed CV Score={cvScore ?? 0}");

            // 2. Interview score
            var evaluatedSteps = application.RecruitementProcesses
                .Where(rp => rp.EvaNote.HasValue && rp.EvaNote.Value >= 0).ToList();
            double? interviewAvg = evaluatedSteps.Any()
                ? evaluatedSteps.Average(rp => rp.EvaNote!.Value)
                : (double?)null;

            // 3. Test score
            var completedTestSessions = application.Sessions
                .Where(s => s.SessionState == true && s.Score.HasValue)
                .ToList();
            double? testAvg = completedTestSessions.Any()
                ? completedTestSessions.Average(s => s.Score!.Value)
                : (double?)null;

            // 4. Final score calculation (Fixed sum of the 3 pillars / 3)
            double totalScoreSum = (cvScore ?? 0.0) + (testAvg ?? 0.0) + (interviewAvg ?? 0.0);
            double finalScore = totalScoreSum / 3.0;

            application.TestScore = testAvg.HasValue ? (int)Math.Round(testAvg.Value) : null;
            application.HrScore = interviewAvg.HasValue ? (int)Math.Round(interviewAvg.Value) : null;
            application.TechScore = application.TestScore;
            application.FinalScore = (decimal)finalScore;

            Console.WriteLine($"[RefreshApplicationScore] AppId={applicationId} Final={application.FinalScore} (CV={cvScore ?? 0}, Tests={testAvg ?? 0}, HR={interviewAvg ?? 0})");

            _quizDbContext.Applications.Update(application);
            await _quizDbContext.SaveChangesAsync();
        }

        public async Task<string> GenerateMeetLink(MeetRequestDto request)
{
    var meeting = await _wherebyService.CreateMeetingAsync(
        request.Summary,
        request.Start,
        request.Start.AddMinutes(request.DurationMinutes)
    );

    return meeting?.RoomUrl ?? "";
}
    }
}