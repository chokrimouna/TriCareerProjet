using QuizBack.Dto;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Quizback.Models;
using QuizBack.utils;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Text;

namespace Quizback.Services
{
    public class SessionService : ISessionService
    {

        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public SessionService(TriCareerContext dbContext, IConfiguration configuration, IJWtService jWtService)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<Session>?> GetAllSessions()
        {
            List<Session> sessions = new List<Session>();
            try
            {
                var query = _dbContext.Sessions.AsQueryable();
                var sessionList = await query
                    .Include(s => s.Application)
                    .Include(s => s.Examn)
                    .OrderByDescending(y => y.SessionId)
                    .ToListAsync();

                foreach (var s in sessionList)
                {
                    if (s.SessionState == true)
                    {
                        var calculatedScore = await CalculateSessionScoreInternal(s.SessionId);
                        if (calculatedScore.HasValue)
                        {
                            s.Score = calculatedScore.Value;
                        }
                    }
                }

                return sessionList;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "GetAllExamen");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return sessions;
            }
        }


        public async Task<Session?> GetSessionById(string encrptsessionId)
        {
            try
            {
                Session? session = await _dbContext.Sessions
                    .FirstOrDefaultAsync(e => e.EncryptedSessinId == encrptsessionId);
                if (session == null)
                {
                    return null;
                };
                return session;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "GetExamenById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }


        public async Task<string> AddSession(SessionDto session)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (session == null) throw new ArgumentNullException(nameof(session));
                Application? app = await _dbContext.Applications.FirstOrDefaultAsync(x => x.ApplicationId == session.ApplicationId);

                if (app == null)
                {
                    throw new Exception("Application Does Not Exist");
                }

                var recruitProcess = await _dbContext.RecruitementProcesses
                    .Where(r => r.ApplicationId == session.ApplicationId)
                    .OrderByDescending(r => r.RecruitementProcessId)
                    .FirstOrDefaultAsync();

                var sessiondata = new Session
                {
                    EncryptedSessinId = null,
                    ExamnId = session.ExamanId,
                    ApplicationId = session.ApplicationId,
                    RecruitementProcessId = recruitProcess?.RecruitementProcessId,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = session.Deadline ?? DateTime.UtcNow.AddDays(1),
                    SessionState = false
                };
                Console.WriteLine($"[AddSession] Creating session for AppId: {session.ApplicationId}, ExamId: {session.ExamanId}");
                _dbContext.Sessions.Add(sessiondata);
                await _dbContext.SaveChangesAsync();
                Console.WriteLine($"[AddSession] Session created with ID: {sessiondata.SessionId}");

                var cryptedID = Crytage.Crypt(sessiondata.SessionId.ToString());

                sessiondata.EncryptedSessinId = cryptedID;

                _dbContext.Sessions.Update(sessiondata);
                await _dbContext.SaveChangesAsync();

                await transaction.CommitAsync();

                // Auto-refresh score after adding session
                await RefreshApplicationScore(session.ApplicationId);

                var sessionLink = $"http://localhost:5174/test/{cryptedID}";

                return sessionLink;

            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "AddExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }


        public async Task<bool?> PutSession(Session session)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (session == null) return false;
                
                var dbSession = await _dbContext.Sessions.FindAsync(session.SessionId);
                if (dbSession == null) return false;

                // Update fields
                dbSession.SessionState = session.SessionState;
                if (session.ExpiresAt != default) dbSession.ExpiresAt = session.ExpiresAt;

                // If session is completed, calculate score
                if (dbSession.SessionState == true)
                {
                    dbSession.Score = await CalculateSessionScoreInternal(dbSession.SessionId);
                }

                _dbContext.Sessions.Update(dbSession);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[PutSession] Error: {ex.Message}");
                return false;
            }
        }
        public async Task<Session?> GetSessionByIdApp(int AppId)
        {
            try
            {
                Session? session = await _dbContext.Sessions
                    .FirstOrDefaultAsync(s => s.ApplicationId == AppId);

                if (session == null)
                    throw new Exception("Application Does Not Exist");
                else
                    return session;
            }
            catch (Exception e)
            {

                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "RoleService", "GetRoleByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }


        public async Task<SessionSectionDto> GetResponseDetailWithScoreByIdSession(string IdSession)
        {
            try
            {
                SessionSectionDto sessionSectionDto = new SessionSectionDto();
                Session? session = await _dbContext.Sessions
                    .Include(s => s.Examn)
                    .Where(x => x.EncryptedSessinId == IdSession)
                    .FirstOrDefaultAsync();

                if (session == null) return null;

                // 1. Get all question IDs for this exam
                List<int> lIdq = await _dbContext.DetailsExamen
                    .Where(x => x.IdExaman == session.ExamnId && x.IdQuestion != null)
                    .Select(x => (int)x.IdQuestion!)
                    .ToListAsync();

                // 2. Get all questions with their answers
                List<Question> allQuestions = await _dbContext.Questions
                    .Include(q => q.Answers)
                    .Include(q => q.IdSectionNavigation)
                    .Where(q => lIdq.Contains(q.IdQuestion))
                    .ToListAsync();

                // 3. Group questions by section
                var groupedBySection = allQuestions.GroupBy(q => q.IdSection);
                List<SectionDto> lSectionDtos = new List<SectionDto>();

                foreach (var group in groupedBySection)
                {
                    var sectionId = group.Key;
                    var sectionName = group.First().IdSectionNavigation?.NameSection ?? "Questions Générales";

                    lSectionDtos.Add(new SectionDto
                    {
                        IdSection = sectionId ?? 0,
                        NameSection = sectionName,
                        questions = group.GroupBy(q => q.IdQuestion).Select(g => g.First()).Select(q => new QuestionDto
                        {
                            IdQuestion = q.IdQuestion,
                            NameQuestion = q.NameQuestion,
                            Barem = q.Barem,
                            answers = q.Answers.GroupBy(a => a.Id).Select(g => g.First()).Select(a => new AnswerDto
                            {
                                Id = a.Id,
                                Label = a.Label ?? a.Name ?? a.Value
                            }).ToList()
                        }).ToList()
                    });
                }

                return new SessionSectionDto
                {
                    SessionId = session.SessionId,
                    ExamTitle = session.Examn?.Titre ?? "Évaluation",
                    Description = session.Examn?.Description,
                    lSection = lSectionDtos
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetResponseDetailWithScoreByIdSession] ERROR: {ex.Message}");
                throw;
            }
        }

        public async Task<List<SessionDetailDto>> GetSessionAllByIdApp(int applicationId)
        {
            List<SessionDetailDto> sessionDetailDtos = new List<SessionDetailDto>();
            try
            {
                Console.WriteLine($"[GetSessionAllByIdApp] Searching for sessions for AppId: {applicationId}");
                
                // Get sessions linked to this application
                var lsessions = await _dbContext.Sessions
                    .Include(s => s.Examn)
                    .Where(s => s.ApplicationId == applicationId)
                    .OrderByDescending(y => y.SessionId)
                    .ToListAsync();

                Console.WriteLine($"[GetSessionAllByIdApp] Found {lsessions.Count} sessions via ApplicationId");

                // If none found via ApplicationId, try via RecruitmentProcess
                if (lsessions.Count == 0)
                {
                    var rpIds = await _dbContext.RecruitementProcesses
                        .Where(rp => rp.ApplicationId == applicationId)
                        .Select(rp => rp.RecruitementProcessId)
                        .ToListAsync();
                    
                    if (rpIds.Any())
                    {
                        lsessions = await _dbContext.Sessions
                            .Include(s => s.Examn)
                            .Where(s => s.RecruitementProcessId.HasValue && rpIds.Contains(s.RecruitementProcessId.Value))
                            .OrderByDescending(y => y.SessionId)
                            .ToListAsync();
                        Console.WriteLine($"[GetSessionAllByIdApp] Found {lsessions.Count} sessions via RecruitmentProcess link");
                    }
                }

                foreach (Session session in lsessions)
                {
                    Console.WriteLine($"[GetSessionAllByIdApp] Processing Session {session.SessionId}");
                    
                    // Total barem and duration calculation
                    List<Question> lqs = new List<Question>();
                    if (session.ExamnId.HasValue)
                    {
                        var qIds = await _dbContext.DetailsExamen
                            .Where(x => x.IdExaman == session.ExamnId)
                            .Select(x => x.IdQuestion)
                            .ToListAsync();
                        
                        lqs = await _dbContext.Questions
                            .Where(x => qIds.Contains(x.IdQuestion))
                            .ToListAsync();
                    }

                    // Map candidate answers and calculate current score for this session
                    foreach (Question q in lqs)
                    {
                        ReponseValue? rv = await _dbContext.ReponseValues
                            .Where(x => x.IdQuestion == q.IdQuestion && x.IdSession == session.SessionId)
                            .FirstOrDefaultAsync();

                        if (rv != null)
                        {
                            q.TimeReponse = rv.TimeReponse;
                            
                            // Safe parsing
                            decimal barem = 0;
                            if (!string.IsNullOrEmpty(q.Barem)) decimal.TryParse(q.Barem, out barem);
                            
                            // Simple score calculation for the dashboard list
                            // In a real scenario, this might need more complex logic if answers aren't simple
                            q.Score = "0"; // Default
                            // (Detailed calculation could be added here if needed for the dashboard)
                        }
                    }

                    SessionDetailDto sessionDetailDto = new SessionDetailDto
                    {
                        Session = session,
                        TotalBarem = lqs.Sum(x => {
                            decimal b = 0;
                            if (!string.IsNullOrEmpty(x.Barem)) decimal.TryParse(x.Barem, out b);
                            return (int)b;
                        }),
                        Totalduree = lqs.Sum(x => !string.IsNullOrEmpty(x.Durée) ? caluculateInfromString(x.Durée) : 0),
                        timeReponse = lqs.Sum(x => (int)(x.TimeReponse ?? 0)),
                        score = lqs.Sum(x => {
                            decimal s = 0;
                            if (!string.IsNullOrEmpty(x.Score)) decimal.TryParse(x.Score, out s);
                            return s;
                        })
                    };

                    sessionDetailDtos.Add(sessionDetailDto);
                }

                return sessionDetailDtos;
            }
            catch (Exception e)
            {
                Console.WriteLine($"[GetSessionAllByIdApp] CRITICAL ERROR for AppId {applicationId}: {e.Message}");
                Console.WriteLine(e.StackTrace);
                return sessionDetailDtos;
            }
        }

        public int caluculateInfromString(string infromString)
        {
            if (string.IsNullOrEmpty(infromString)) return 0;
            string trimdure = infromString.Replace("m", "").Replace("s", "");
            List<string> ls = trimdure.Split(':').ToList();
            int res = 0;
            if (ls.Count > 1)
            {
                int.TryParse(ls[0], out int min);
                int.TryParse(ls[1], out int sec);
                res = min * 60 + sec;
            }
            else if (ls.Count == 1)
            {
                int.TryParse(ls[0], out int sec);
                res = sec;
            }
            return res;
        }


        

        public async Task<string> AddNewSessionForSameRecProcess(Session session)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (session == null) return "";

                Session? dbSession = await _dbContext.Sessions.FindAsync(session.SessionId);
                if (dbSession == null) return "";

                dbSession.SessionState = true;
                _dbContext.Sessions.Update(dbSession);
                await _dbContext.SaveChangesAsync();

                var sessiondata = new Session
                {
                    EncryptedSessinId = null,
                    ExamnId = session.ExamnId,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(1),
                    RecruitementProcessId =  session.RecruitementProcessId,
                    SessionState = false
                    

                };
                _dbContext.Sessions.Add(sessiondata);
                await _dbContext.SaveChangesAsync();

                var cryptedID = Crytage.Crypt(sessiondata.SessionId.ToString());
                sessiondata.EncryptedSessinId = cryptedID;

                _dbContext.Sessions.Update(sessiondata);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return $"http://localhost:5174/test/{cryptedID}";
         
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "AddExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return "";
            }
        }


        public async Task<List<Session>?> GetAllSessions(int? departmentId = null, int? userId = null)
        {
            try
            {
                var query = _dbContext.Sessions.AsQueryable();
                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    query = query.Where(s =>
                        (s.Application != null && s.Application.JobPosting != null && s.Application.JobPosting.DepartmentId == departmentId.Value) ||
                        (s.Examn != null && s.Examn.User != null && s.Examn.User.DepartmentId == departmentId.Value)
                    );
                }
                else if (userId.HasValue)
                {
                    query = query.Where(s => s.Application != null && s.Application.UserId == userId);
                }

                List<Session> sessions = await query
                    .Select(s => new Session()
                    {
                        ApplicationId = s.ApplicationId,
                        Application = _dbContext.Applications.FirstOrDefault(a => a.ApplicationId == s.ApplicationId),
                        CreatedAt = s.CreatedAt,
                        EncryptedSessinId = s.EncryptedSessinId,
                        Examn = s.Examn,
                        ExamnId = s.ExamnId,
                        ExpiresAt = s.ExpiresAt,
                        RecruitementProcess = _dbContext.RecruitementProcesses.Select(r => new RecruitementProcess()
                        {
                            IdStatus = r.IdStatus,
                            IdPositionNavigation = r.IdPositionNavigation,
                            IdPosition = r.IdPosition,
                            Final = r.Final,
                            EvaNote = r.EvaNote,
                            IdStatusNavigation = r.IdStatusNavigation,
                            Application = r.Application,
                            ApplicationId = r.ApplicationId,
                            DataEva = r.DataEva,
                            User = r.User != null ? new User()
                            {
                                Name = r.User.Name,
                                Prename = r.User.Prename,
                                Email = r.User.Email
                            } : null,
                            UserId = r.UserId,
                            RecruitementProcessId = r.RecruitementProcessId,
                            DatePlanification = r.DatePlanification,
                        }).Where(r => r.RecruitementProcessId == s.RecruitementProcessId).SingleOrDefault(),
                        RecruitementProcessId = s.RecruitementProcessId,
                        SessionId = s.SessionId,
                        SessionState = s.SessionState
                    })
                    .OrderByDescending(y => y.SessionId)
                    .ToListAsync();

                return sessions;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "GetAllSessions");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new List<Session>();
            }
        }

        public async Task<object> GetSimpleSessionsByAppId(int appId)
        {
            var sessions = await _dbContext.Sessions
                .Include(s => s.Examn)
                .Where(s => s.ApplicationId == appId)
                .OrderByDescending(s => s.SessionId)
                .ToListAsync();

            sessions = sessions.GroupBy(s => s.ExamnId).Select(g => g.First()).ToList();

            var result = new List<object>();
            foreach (var s in sessions)
            {
                double score = s.Score ?? 0;

                // For completed sessions, try to auto-calculate if it's a quiz (has IsCorrect definitions)
                // Resilient: a single malformed session must NOT wipe the whole list (empty Tests tab bug)
                if (s.SessionState == true)
                {
                    try
                    {
                        double? calculatedScore = await CalculateSessionScoreInternal(s.SessionId);
                        if (calculatedScore.HasValue)
                        {
                            // Quiz: Persist and update local score
                            score = calculatedScore.Value;
                            s.Score = score;
                            _dbContext.Sessions.Update(s);
                            await _dbContext.SaveChangesAsync();
                            Console.WriteLine($"[GetSimpleSessionsByAppId] Recalculated quiz session {s.SessionId}: {score}");
                        }
                        else if (s.Score.HasValue)
                        {
                            // Manual test with an existing score: use it
                            score = s.Score.Value;
                        }
                    }
                    catch (Exception exCalc)
                    {
                        // Fallback to the stored score; keep listing the session regardless
                        score = s.Score ?? 0;
                        Console.WriteLine($"[GetSimpleSessionsByAppId] Score recalculation failed for session {s.SessionId}: {exCalc.Message}");
                    }
                }

                result.Add(new {
                    sessionId = s.SessionId,
                    encryptedId = s.EncryptedSessinId,
                    examnId = s.ExamnId,
                    applicationId = s.ApplicationId,
                    sessionState = s.SessionState,
                    createdAt = s.CreatedAt,
                    dateDebut = s.CreatedAt,
                    expiresAt = s.ExpiresAt,
                    score = score,
                    examTitle = s.Examn?.Titre,
                    examDuration = s.Examn?.Duration,
                    examen = s.Examn != null ? new { titre = s.Examn.Titre } : null,
                });
            }
            return result;
        }


        public async Task<bool> DeleteSession(int sessionId)
        {
            try
            {
                var session = await _dbContext.Sessions.FindAsync(sessionId);
                if (session == null) return false;

                // Purge TestChecklist avant la session (FK Session, NO_ACTION) : sinon la
                // suppression échoue (500) dès que ce test a une checklist associée.
                await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM TestChecklist WHERE SessionId = {sessionId}");

                var responses = await _dbContext.ReponseValues.Where(r => r.IdSession == sessionId).ToListAsync();
                foreach (var resp in responses)
                {
                    var details = _dbContext.ReponseDetails.Where(d => d.IdReponseValue == resp.IdReponse);
                    _dbContext.ReponseDetails.RemoveRange(details);
                }
                _dbContext.ReponseValues.RemoveRange(responses);
                _dbContext.Sessions.Remove(session);
                await _dbContext.SaveChangesAsync();

                if (session.ApplicationId.HasValue)
                {
                    await RefreshApplicationScore(session.ApplicationId.Value);
                }

                return true;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "DeleteSession");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return false;
            }
        }

        public async Task<bool> UpdateScore(int sessionId, int score, string? reviewComment)
        {
            try
            {
                var session = await _dbContext.Sessions
                    .Include(s => s.RecruitementProcess)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null) return false;
                session.SessionState = true;
                session.Score = score;

                // Update: Test evaluations are now independent of interview evaluation notes (EvaNote).
                // We no longer overwrite the RecruitementProcess evaluation with the test score.
                
                _dbContext.Sessions.Update(session);
                await _dbContext.SaveChangesAsync();

                if (session.ApplicationId.HasValue)
                    await RefreshApplicationScore(session.ApplicationId.Value);

                return true;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SessionService", "UpdateScore");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return false;
            }
        }

        public async Task RefreshApplicationScore(int applicationId)
        {
            var application = await _dbContext.Applications
                .Include(a => a.RecruitementProcesses)
                .Include(a => a.Sessions)
                .Include(a => a.AiResults)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);

            if (application == null) return;

            // 1. CV Matching score from AI Results
            double? cvScore = null;
            
            // Try fetching directly from DB to be 100% sure we have the latest data
            var latestAiResult = await _dbContext.AiResults
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

            // 2. Interview score: average of all evaluated recruitment process steps
            var evaluatedSteps = application.RecruitementProcesses
                .Where(rp => rp.EvaNote.HasValue && rp.EvaNote.Value >= 0).ToList();
            double? interviewAvg = evaluatedSteps.Any()
                ? evaluatedSteps.Average(rp => rp.EvaNote!.Value)
                : (double?)null;

            // 3. Test score: comes from completed session scores.
            var testSessions = new List<Session>();
            foreach (var s in application.Sessions.Where(s => s.SessionState == true))
            {
                // 1. Try to auto-calculate for quizzes
                var calculated = await CalculateSessionScoreInternal(s.SessionId);
                if (calculated.HasValue)
                {
                    s.Score = calculated.Value;
                    _dbContext.Sessions.Update(s);
                    testSessions.Add(s);
                }
                // 2. If it's a manual test (or quiz with stored score), use the stored value
                else if (s.Score.HasValue)
                {
                    testSessions.Add(s);
                }
            }

            double? testAvg = testSessions.Any()
                ? testSessions.Select(s => s.Score ?? 0.0).Average()
                : (double?)null;

            // 4. Final score calculation (Fixed sum of the 3 pillars / 3)
            // This ensures the score "increases" as more evaluations are completed.
            double totalScoreSum = (cvScore ?? 0.0) + (testAvg ?? 0.0) + (interviewAvg ?? 0.0);
            double finalScore = totalScoreSum / 3.0;

            application.TestScore = testAvg.HasValue ? (int)Math.Round(testAvg.Value) : null;
            application.HrScore = interviewAvg.HasValue ? (int)Math.Round(interviewAvg.Value) : null;
            application.TechScore = application.TestScore;
            application.FinalScore = (decimal)finalScore;

            Console.WriteLine($"[RefreshApplicationScore] AppId={applicationId} Final={application.FinalScore} (CV={cvScore ?? 0}, Tests={testAvg ?? 0}, HR={interviewAvg ?? 0})");

            // AdminDecision is set ONLY by human action (removed auto-reject logic)

            _dbContext.Applications.Update(application);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<object?> GetSessionResult(int sessionId)
        {
            try
            {
                var session = await _dbContext.Sessions
                    .Include(s => s.Examn)
                    .Include(s => s.Application)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null) return null;

                var questionIds = await _dbContext.DetailsExamen
                    .Where(d => d.IdExaman == session.ExamnId && d.IdQuestion != null)
                    .Select(d => d.IdQuestion!.Value)
                    .Distinct()
                    .ToListAsync();

                var questions = await _dbContext.Questions
                    .Include(q => q.Answers)
                    .Where(q => questionIds.Contains(q.IdQuestion))
                    .ToListAsync();

                int totalQuestions = questions.Count;
                decimal totalScore = 0;
                var questionResults = new List<object>();

                foreach (var q in questions)
                {
                    var rv = await _dbContext.ReponseValues
                        .Include(r => r.ReponseDetails)
                        .FirstOrDefaultAsync(r => r.IdQuestion == q.IdQuestion && r.IdSession == sessionId);

                    var selectedAnswerIds = rv?.ReponseDetails
                        .Where(rd => rd.IdAnswers.HasValue)
                        .Select(rd => rd.IdAnswers!.Value)
                        .ToList() ?? new List<int>();

                    var textAnswer = rv?.ReponseDetails.FirstOrDefault(rd => rd.IdAnswers == null)?.Value;

                    // Use Barem if available, otherwise fallback to 100 / totalQuestions
                    decimal baremValue = 0;
                    if (!string.IsNullOrEmpty(q.Barem)) decimal.TryParse(q.Barem, out baremValue);
                    
                    decimal questionPoints = baremValue > 0 ? baremValue : (totalQuestions > 0 ? 100m / totalQuestions : 0);
                    decimal questionScore = 0;

                    if (selectedAnswerIds.Count > 0)
                    {
                        int correctCount = q.Answers.Count(a => a.IsCorrect == 1);
                        decimal pointPerCorrect = correctCount > 0 ? questionPoints / correctCount : 0;
                        int userCorrect = selectedAnswerIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 1));
                        int userIncorrect = selectedAnswerIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 0));
                        questionScore = Math.Max(0, (userCorrect - userIncorrect) * pointPerCorrect);
                    }

                    totalScore += questionScore;

                    string questionType = "mcq";
                    if (!string.IsNullOrEmpty(textAnswer)) questionType = "text";

                    string? userAnswer = null;
                    if (selectedAnswerIds.Count > 0)
                    {
                        var firstSelected = q.Answers.FirstOrDefault(a => selectedAnswerIds.Contains(a.Id));
                        userAnswer = firstSelected?.Label ?? firstSelected?.Name;
                    }
                    else if (!string.IsNullOrEmpty(textAnswer))
                    {
                        userAnswer = textAnswer;
                    }

                    questionResults.Add(new
                    {
                        textQuestion = q.NameQuestion,
                        typeQuestion = questionType,
                        userAnswer = userAnswer,
                        questionScore = Math.Round(questionScore, 1),
                        options = q.Answers.Select(a => new
                        {
                            textOption = a.Label ?? a.Name,
                            isCorrect = a.IsCorrect == 1,
                            isSelected = selectedAnswerIds.Contains(a.Id)
                        }).ToList()
                    });
                }

                var grouped = new List<object>();
                var bySection = questions.GroupBy(q => q.IdSection);
                foreach (var grp in bySection)
                {
                    Section? sec = grp.Key.HasValue ? await _dbContext.Sections.FindAsync(grp.Key.Value) : null;
                    var sectionName = sec?.NameSection ?? "Questions Générales";
                    var sectionQs = grp.Select(q => questionResults[questions.IndexOf(q)]).ToList();
                    grouped.Add(new { nomSection = sectionName, questions = sectionQs });
                }

                return new
                {
                    score = Math.Round(totalScore, 1),
                    examTitle = session.Examn?.Titre,
                    sessionId = session.SessionId,
                    candidateName = session.Application?.NameApplication,
                    sections = grouped,
                    isManual = questions.All(q => !q.Answers.Any(a => a.IsCorrect == 1))
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetSessionResult error: {ex.Message}");
                return null;
            }
        }

        public async Task<double?> CalculateSessionScoreInternal(int sessionId)
        {
            var session = await _dbContext.Sessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (session == null) return null;

            var questionIds = await _dbContext.DetailsExamen
                .Where(d => d.IdExaman == session.ExamnId && d.IdQuestion != null)
                .Select(d => d.IdQuestion!.Value)
                .Distinct()
                .ToListAsync();

            var questions = await _dbContext.Questions
                .Include(q => q.Answers)
                .Where(q => questionIds.Contains(q.IdQuestion))
                .ToListAsync();

            if (questions.Count == 0) return null;

            // Check if there are any MCQ/Boolean answers to calculate. 
            // If it's a redaction/code test, questions might exist but have no "IsCorrect" answers.
            bool hasQuizQuestions = questions.Any(q => q.Answers.Any(a => a.IsCorrect == 1));
            if (!hasQuizQuestions) return null;

            decimal totalScore = 0;
            foreach (var q in questions)
            {
                var rv = await _dbContext.ReponseValues
                    .Include(r => r.ReponseDetails)
                    .FirstOrDefaultAsync(r => r.IdQuestion == q.IdQuestion && r.IdSession == sessionId);
                
                if (rv == null) continue;

                var selectedIds = rv.ReponseDetails
                    .Where(rd => rd.IdAnswers.HasValue)
                    .Select(rd => rd.IdAnswers!.Value)
                    .ToList();
                
                if (selectedIds.Count == 0) continue;

                // Use Barem if available, otherwise fallback to 100 / totalQuestions
                decimal baremValue = 0;
                if (!string.IsNullOrEmpty(q.Barem)) decimal.TryParse(q.Barem, out baremValue);
                decimal questionPoints = baremValue > 0 ? baremValue : (questions.Count > 0 ? 100m / questions.Count : 0);

                int correctCount = q.Answers.Count(a => a.IsCorrect == 1);
                
                if (correctCount == 0) continue;

                decimal ppc = questionPoints / correctCount;
                int userCorrect = selectedIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 1));
                int userIncorrect = selectedIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 0));
                
                totalScore += Math.Max(0, (userCorrect - userIncorrect) * ppc);
            }

            return (double)Math.Round(totalScore, 1);
        }
    }
}
