using QuizBack.Dto;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Quizback.Models;
using Quizback.Services;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SessionsController : ControllerBase
    {
        private readonly ISessionService _sessionService;
        private readonly IEmailService _emailService;
        private readonly TriCareerContext _dbContext;
        private readonly IRecruitementProcessService _recruitementProcessService;
        private readonly INotificationService _notificationService;

        public SessionsController(
            ISessionService sessionService,
            IEmailService emailService,
            TriCareerContext dbContext,
            IRecruitementProcessService recruitementProcessService,
            INotificationService notificationService)
        {
            _sessionService = sessionService;
            _emailService = emailService;
            _dbContext = dbContext;
            _recruitementProcessService = recruitementProcessService;
            _notificationService = notificationService;
        }

        // GET api/Sessions
        [HttpGet]
        public async Task<IActionResult> GetAllSessions(
            [FromQuery] int? departmentId = null,
            [FromQuery] int? userId = null)
        {
            try
            {
                var sessions = await _sessionService.GetAllSessions(departmentId, userId);
                return Ok(sessions);
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }

        // GET api/Sessions/{encrptid}
        [HttpGet("{encrptid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSessionByID(string encrptid)
        {
            try
            {
                var session = await _sessionService.GetSessionById(encrptid);
                return Ok(session);
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }

        [HttpGet("GetSessionAllByIdApp/{idApp}")]
        public async Task<IActionResult> GetSessionAllByIdApp(int idApp)
        {
            try
            {
                if (idApp == 0)
                {
                    return BadRequest();
                }

                List<SessionDetailDto> sessionDetailDtos =
                    await _sessionService.GetSessionAllByIdApp(idApp);

                return Ok(sessionDetailDtos);
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }

        [HttpGet("simple/{appId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSimpleSessionsByAppId(int appId)
        {
            try
            {
                var result = await _sessionService.GetSimpleSessionsByAppId(appId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetSimpleSessionsByAppId error: {ex.Message}");
                return Ok(new List<object>());
            }
        }

        [HttpGet("details/{idprocess}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetResponseDetailWithScoreByIdSession(string idprocess)
        {
            try
            {
                SessionSectionDto sessionSectionDto =
                    await _sessionService.GetResponseDetailWithScoreByIdSession(idprocess);

                return Ok(sessionSectionDto);
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }

        // GET api/Sessions/result/42
        [HttpGet("result/{sessionId:int}")]
        public async Task<IActionResult> GetSessionResult(int sessionId)
        {
            try
            {
                var result = await _sessionService.GetSessionResult(sessionId);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetSessionResult error: {ex.Message}");
                return BadRequest("error: " + ex.Message);
            }
        }

        [HttpGet("RefreshScore/{applicationId:int}")]
        public async Task<IActionResult> RefreshScore(int applicationId)
        {
            try
            {
                await _sessionService.RefreshApplicationScore(applicationId);
                return Ok(new { message = "Score refreshed" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("RefreshScore/{applicationId:int}")]
        public async Task<IActionResult> RefreshScorePost(int applicationId)
        {
            try
            {
                await _sessionService.RefreshApplicationScore(applicationId);
                return Ok(new { message = "Score refreshed" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("byappid/{AppId}")]
        public async Task<IActionResult> GetSessionByIDApplication(int AppId)
        {
            var application = await _sessionService.GetSessionByIdApp(AppId);

            if (application != null)
            {
                return Ok(application);
            }

            return NotFound();
        }

        // POST api/Sessions
        [HttpPost]
        public async Task<IActionResult> AddSession(SessionDto session)
        {
            try
            {
                if (session == null)
                    return BadRequest("Session data is null");

                Console.WriteLine($"[AssignTest] Starting for AppId: {session.ApplicationId}, ExamanId: {session.ExamanId}");

                string mess = await _sessionService.AddSession(session);

                if (string.IsNullOrEmpty(mess))
                {
                    return BadRequest("Failed to create session link");
                }

                var application = await _dbContext.Applications
                    .Include(a => a.User)
                    .FirstOrDefaultAsync(a => a.ApplicationId == session.ApplicationId);

                var exam = await _dbContext.Examen.FindAsync(session.ExamanId);

                // Même logique de repli que la liste candidats côté frontend (NameApplication
                // peut être vide sur d'anciennes candidatures) : on retombe sur le nom de
                // l'utilisateur avant d'afficher un nom générique.
                var userFullName = application?.User != null
                    ? $"{application.User.Name} {application.User.Prename}".Trim()
                    : null;
                var candidateName = !string.IsNullOrWhiteSpace(application?.NameApplication)
                    ? application!.NameApplication!
                    : (!string.IsNullOrWhiteSpace(userFullName) ? userFullName! : "Candidat");
                Console.WriteLine($"[AssignTest] Resolved candidate name: '{candidateName}' (NameApplication='{application?.NameApplication}', UserFullName='{userFullName}')");
                var testTitle = exam?.Titre ?? "Test Technique";
                var candidateEmail = session.ApplicationEmail ?? application?.Email;

                bool emailSent = false;
                string? emailError = null;
                try
                {
                    if (!string.IsNullOrEmpty(candidateEmail))
                    {
                        Console.WriteLine($"[AssignTest] Sending email to: {candidateEmail}");
                        await _emailService.SendTestInvitation(
                            candidateEmail,
                            candidateName,
                            testTitle,
                            mess);
                        emailSent = true;
                    }
                    else
                    {
                        emailError = "Aucun email trouvé pour ce candidat.";
                        Console.WriteLine("[AssignTest] No email found for candidate");
                    }
                }
                catch (Exception emailEx)
                {
                    emailError = emailEx.Message;
                    Console.WriteLine("[AssignTest] Email sending failed: " + emailEx.Message);
                }

                // Notification temps réel pour le CANDIDAT : un test lui a été affecté.
                try
                {
                    int? candidateUserId = null;
                    if (!string.IsNullOrEmpty(candidateEmail))
                    {
                        var candUser = await _dbContext.Users
                            .FirstOrDefaultAsync(u => u.Email == candidateEmail);
                        candidateUserId = candUser?.UserId;
                    }
                    if (candidateUserId != null)
                    {
                        await _notificationService.CreateNotificationAsync(new Notification
                        {
                            UserId = candidateUserId,
                            Message = $"Un nouveau test vous a été affecté : « {testTitle} ». Rendez-vous dans « Mes Tests ».",
                            Timestamp = DateTime.Now,
                            IsRead = false,
                        });
                    }
                }
                catch (Exception notifEx)
                {
                    Console.WriteLine("[AssignTest] Notification failed: " + notifEx.Message);
                }

                return Ok(new { sessionUrl = mess, emailSent, emailError, candidateEmail });
            }
            catch (Exception ex)
            {
                Console.WriteLine("[AssignTest] CRITICAL ERROR: " + ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("UpdateScore")]
        public async Task<IActionResult> UpdateScore([FromBody] SessionScoreUpdateDto updateDto)
        {
            try
            {
                bool res = await _sessionService.UpdateScore(
                    updateDto.SessionId,
                    updateDto.Score,
                    updateDto.ReviewComment);

                if (res)
                    return Ok(true);

                return BadRequest("Failed to update score");
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }

        [HttpGet("debug2")]
        public async Task<IActionResult> DebugSessionsSafe()
        {
            var sessions = await _dbContext.Sessions
                .OrderByDescending(s => s.SessionId)
                .Take(10)
                .Select(s => new {
                    s.SessionId,
                    s.ApplicationId,
                    s.ExamnId,
                    s.SessionState,
                    s.RecruitementProcessId
                })
                .ToListAsync();

            return Ok(sessions);
        }

        [HttpGet("debug")]
        public async Task<IActionResult> DebugSessions()
        {
            var sessions = await _dbContext.Sessions
                .OrderByDescending(s => s.SessionId)
                .Take(10)
                .ToListAsync();

            return Ok(sessions);
        }

        /// <summary>
        /// Debug endpoint: shows stored answers + IsCorrect flags + calculated score for a session.
        /// Call: GET /api/Sessions/debug-score/{sessionId}
        /// </summary>
        [HttpGet("debug-score/{sessionId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> DebugScore(int sessionId)
        {
            var session = await _dbContext.Sessions
                .Include(s => s.Examn)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId);

            if (session == null) return NotFound("Session not found");

            var questionIds = await _dbContext.DetailsExamen
                .Where(d => d.IdExaman == session.ExamnId && d.IdQuestion != null)
                .Select(d => d.IdQuestion!.Value)
                .Distinct()
                .ToListAsync();

            var questions = await _dbContext.Questions
                .Include(q => q.Answers)
                .Where(q => questionIds.Contains(q.IdQuestion))
                .ToListAsync();

            var debugInfo = new List<object>();
            decimal totalScore = 0;

            foreach (var q in questions)
            {
                var rv = await _dbContext.ReponseValues
                    .Include(r => r.ReponseDetails)
                    .FirstOrDefaultAsync(r => r.IdQuestion == q.IdQuestion && r.IdSession == sessionId);

                var selectedIds = rv?.ReponseDetails
                    .Where(rd => rd.IdAnswers.HasValue)
                    .Select(rd => rd.IdAnswers!.Value)
                    .ToList() ?? new List<int>();

                decimal baremValue = 0;
                if (!string.IsNullOrEmpty(q.Barem)) decimal.TryParse(q.Barem, out baremValue);
                decimal questionPoints = baremValue > 0 ? baremValue : (questions.Count > 0 ? 100m / questions.Count : 0);

                int correctCount = q.Answers.Count(a => a.IsCorrect == 1);
                int userCorrect = selectedIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 1));
                int userIncorrect = selectedIds.Count(id => q.Answers.Any(a => a.Id == id && a.IsCorrect == 0));
                decimal qScore = correctCount > 0 ? Math.Max(0, (userCorrect - userIncorrect) * (questionPoints / correctCount)) : 0;
                totalScore += qScore;

                debugInfo.Add(new
                {
                    questionId = q.IdQuestion,
                    questionText = q.NameQuestion,
                    barem = q.Barem,
                    questionPoints,
                    answers = q.Answers.Select(a => new
                    {
                        a.Id,
                        label = a.Label ?? a.Name,
                        isCorrect = a.IsCorrect,
                        wasSelected = selectedIds.Contains(a.Id)
                    }),
                    candidateSelectedIds = selectedIds,
                    hasResponseValue = rv != null,
                    correctCount,
                    userCorrect,
                    userIncorrect,
                    questionScore = qScore
                });
            }

            var calculatedScore = await _sessionService.CalculateSessionScoreInternal(sessionId);

            return Ok(new
            {
                sessionId,
                storedScore = session.Score,
                calculatedScore,
                totalScoreManual = totalScore,
                sessionState = session.SessionState,
                examId = session.ExamnId,
                examTitle = session.Examn?.Titre,
                totalQuestions = questions.Count,
                hasAnyCorrectAnswers = questions.Any(q => q.Answers.Any(a => a.IsCorrect == 1)),
                questions = debugInfo
            });
        }


        [HttpPut]
        public async Task<IActionResult> PutSession(Session session)
        {
            try
            {
                if (session == null)
                {
                    return BadRequest();
                }

                bool? res = await _sessionService.PutSession(session);

                if (res == false)
                {
                    return BadRequest();
                }

                return Ok(res);
            }
            catch
            {
                return BadRequest();
            }
        }

        // PATCH api/Sessions/{sessionId}/complete
        [HttpPatch("{sessionId:int}/complete")]
        [AllowAnonymous]
        public async Task<IActionResult> MarkSessionComplete(int sessionId, [FromQuery] int tabSwitchCount = 0)
        {
            try
            {
                var session = await _dbContext.Sessions.FindAsync(sessionId);

                if (session == null)
                    return NotFound("Session not found");

                session.SessionState = true;

                // US17 - Anti-triche : enregistrer le nombre de sorties d'onglet pendant le test
                session.TabSwitchCount = tabSwitchCount;
                if (tabSwitchCount > 0)
                    Console.WriteLine($"[MarkSessionComplete] SessionId={sessionId} — {tabSwitchCount} sortie(s) d'onglet détectée(s)");

                // Calculate and persist the quiz score from the submitted answers
                double? calculatedScore = await _sessionService.CalculateSessionScoreInternal(sessionId);
                if (calculatedScore.HasValue)
                {
                    session.Score = calculatedScore.Value;
                    Console.WriteLine($"[MarkSessionComplete] SessionId={sessionId} score calculated: {calculatedScore.Value}");
                }
                else
                {
                    Console.WriteLine($"[MarkSessionComplete] SessionId={sessionId} — no auto-score (manual/redaction test)");
                }

                await _dbContext.SaveChangesAsync();

                // Refresh the application's aggregate score
                if (session.ApplicationId.HasValue)
                {
                    await _sessionService.RefreshApplicationScore(session.ApplicationId.Value);
                }

                return Ok(new
                {
                    message = "Session marked as complete",
                    sessionId,
                    score = calculatedScore
                });
            }
            catch (Exception ex)
            {
                return BadRequest("error: " + ex.Message);
            }
        }

        // POST api/Sessions/AddNewSessionForSameRecProcess
        [HttpPost("AddNewSessionForSameRecProcess")]
        public async Task<IActionResult> AddNewSessionForSameRecProcess(Session session)
        {
            try
            {
                if (session == null)
                    return BadRequest("Session data is null");

                Console.WriteLine($"[ReassignTest] Starting for RecProcessId: {session.RecruitementProcessId}, ExamId: {session.ExamnId}");

                string res = await _sessionService.AddNewSessionForSameRecProcess(session);

                if (string.IsNullOrEmpty(res))
                {
                    return BadRequest("Failed to reassign session");
                }

                var recProcess = await _dbContext.RecruitementProcesses
                    .Include(r => r.Application)
                    .FirstOrDefaultAsync(r => r.RecruitementProcessId == session.RecruitementProcessId);

                var exam = await _dbContext.Examen.FindAsync(session.ExamnId);

                var candidateName = recProcess?.Application?.NameApplication ?? "Candidat";
                var testTitle = exam?.Titre ?? "Test Technique";
                var candidateEmail = recProcess?.Application?.Email;

                try
                {
                    if (!string.IsNullOrEmpty(candidateEmail))
                    {
                        Console.WriteLine($"[ReassignTest] Sending email to: {candidateEmail}");
                        await _emailService.SendTestInvitation(
                            candidateEmail,
                            candidateName,
                            testTitle,
                            res);
                    }
                    else
                    {
                        Console.WriteLine("[ReassignTest] No email found for candidate");
                    }
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine("[ReassignTest] Email sending failed: " + emailEx.Message);
                }

                return Ok(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine("[ReassignTest] CRITICAL ERROR: " + ex.Message);
                return BadRequest("error: " + ex.Message);
            }
        }

        [HttpPost("upload")]
        [AllowAnonymous]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadTestFile(
            [FromForm] IFormFile? file,
            [FromForm] int sessionId)
        {
            Console.WriteLine($"[Upload] Start: SessionId={sessionId}, FileName={file?.FileName}, Length={file?.Length}");

            try
            {
                if (file == null || file.Length == 0)
                {
                    Console.WriteLine("[Upload] Error: No file provided");
                    return BadRequest("Aucun fichier n'a été fourni.");
                }

                Console.WriteLine("[Upload] Fetching session from DB...");

                var session = await _dbContext.Sessions
                    .Include(s => s.Examn)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null)
                {
                    Console.WriteLine($"[Upload] Error: Session {sessionId} not found");
                    return BadRequest("Session non trouvée.");
                }

                var title = session.Examn?.Titre?.ToLower() ?? "";
                var extension = Path.GetExtension(file.FileName).ToLower();

                Console.WriteLine($"[Upload] ExamTitle={title}, Extension={extension}");

                bool isValid = true;

                if (title.Contains("design"))
                {
                    isValid = new[] { ".psd", ".ai", ".figma", ".zip", ".pdf", ".png", ".jpg", ".jpeg" }
                        .Contains(extension);
                }
                else if (title.Contains("code"))
                {
                    isValid = new[] { ".zip", ".rar", ".7z", ".pdf", ".doc", ".docx", ".txt" }
                        .Contains(extension);
                }
                else if (title.Contains("redaction"))
                {
                    isValid = new[] { ".doc", ".docx", ".pdf", ".txt" }
                        .Contains(extension);
                }

                if (!isValid)
                {
                    Console.WriteLine($"[Upload] Error: Invalid extension {extension} for {title}");
                    return BadRequest($"Extension {extension} non autorisée pour ce type de test.");
                }

                var safeFileName = file.FileName;

                if (safeFileName.Length > 100)
                {
                    safeFileName = safeFileName.Substring(safeFileName.Length - 100);
                }

                var fileName = $"{sessionId}_{DateTime.UtcNow.Ticks}_{safeFileName}";
                var path = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "Resources/Tests",
                    fileName);

                Console.WriteLine($"[Upload] Target path: {path}");

                var directory = Path.GetDirectoryName(path);

                if (!Directory.Exists(directory))
                {
                    Console.WriteLine($"[Upload] Creating directory: {directory}");
                    Directory.CreateDirectory(directory!);
                }

                Console.WriteLine("[Upload] Saving file...");

                using (var stream = new FileStream(path, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                Console.WriteLine("[Upload] File saved successfully");

                Console.WriteLine("[Upload] Linking file to session in DB...");

                var responseValue = new ReponseValue
                {
                    IdSession = sessionId,
                    Answered = true,
                    TimeReponse = 0
                };

                _dbContext.ReponseValues.Add(responseValue);
                await _dbContext.SaveChangesAsync();

                var responseDetail = new ReponseDetail
                {
                    IdReponseValue = responseValue.IdReponse,
                    Value = fileName
                };

                _dbContext.ReponseDetails.Add(responseDetail);

                session.SessionState = true;

                await _dbContext.SaveChangesAsync();

                if (session.ApplicationId.HasValue)
                {
                    await _sessionService.RefreshApplicationScore(session.ApplicationId.Value);
                }

                Console.WriteLine("[Upload] All DB operations completed");

                return Ok(new
                {
                    message = "File uploaded successfully.",
                    fileName
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Upload] CRITICAL EXCEPTION: {ex.Message}");

                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[Upload] INNER EXCEPTION: {ex.InnerException.Message}");
                }

                return BadRequest("error " + ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSession(int id)
        {
            try
            {
                bool result = await _sessionService.DeleteSession(id);

                if (!result)
                    return NotFound();

                return Ok(new
                {
                    message = "Session deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest("error " + ex.Message);
            }
        }
    }
}