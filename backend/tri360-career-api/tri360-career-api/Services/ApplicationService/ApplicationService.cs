using System.IO;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuizBack.Dto;
using Quizback.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly IEmailService _emailService;
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        private readonly string _connectionString;

        public ApplicationService(TriCareerContext context, IConfiguration configuration, IEmailService emailService)
        {
            _quizDbContext = context;
            _emailService = emailService;
            _connectionString = configuration.GetConnectionString("ConnectionString") ?? "";
        }

        // Implémentation des méthodes de l'interface IApplicationService

        public async Task AddApplication(Application application)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (application == null)
                    return;

                await _quizDbContext.Applications.AddAsync(application);
                await _quizDbContext.SaveChangesAsync();

                DateTime localDate = DateTime.Now;

                var hist = new HistoriqueApplication
                {
                    IdApplication = application.ApplicationId,
                    IdState = application.IdState,
                    // JobPosting = application.JobPostingId ,
                    DateHist = localDate
                };

                _quizDbContext.Add(hist);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "AddApplication");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur d'ajout d'application.", e);
            }
        }

        public async Task DeleteApplication(int Id)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                // Charge tout le graphe lié (feuilles incluses) : sans ça, SQL Server refuse la
                // suppression de l'Application dès qu'un test/entretien/résultat IA y fait référence
                // (violation de contrainte FK) → c'était la cause du "impossible de supprimer un candidat".
                Application? application = await _quizDbContext.Applications
                    .Include(a => a.AiResults)
                    .Include(a => a.HistoriqueApplications)
                    .Include(a => a.Sessions).ThenInclude(s => s.ReponseValues).ThenInclude(r => r.ReponseDetails)
                    .Include(a => a.RecruitementProcesses).ThenInclude(rp => rp.Comments)
                    .Include(a => a.RecruitementProcesses).ThenInclude(rp => rp.Timelines)
                    .Include(a => a.RecruitementProcesses).ThenInclude(rp => rp.Sessions).ThenInclude(s => s.ReponseValues).ThenInclude(r => r.ReponseDetails)
                    .FirstOrDefaultAsync(a => a.ApplicationId == Id);
                if (application == null)
                    return;

                // Toutes les sessions liées (directement à l'application ET via ses entretiens),
                // dédupliquées par Id — nécessaire pour purger la table TestChecklist (FK Session,
                // NO_ACTION). Suppression en SQL brut : la table réelle "TestChecklist" ne correspond
                // pas au nom attendu par le DbSet EF "TestChecklistResponses" (bug préexistant de
                // mapping, hors du périmètre de ce correctif), donc inutilisable via LINQ ici.
                var allSessionIds = application.Sessions.Select(s => s.SessionId)
                    .Concat(application.RecruitementProcesses.SelectMany(rp => rp.Sessions).Select(s => s.SessionId))
                    .Distinct()
                    .ToList();
                if (allSessionIds.Count > 0)
                {
                    var idList = string.Join(",", allSessionIds);
                    await _quizDbContext.Database.ExecuteSqlRawAsync(
                        $"DELETE FROM TestChecklist WHERE SessionId IN ({idList})");
                }

                foreach (var rp in application.RecruitementProcesses)
                {
                    foreach (var s in rp.Sessions)
                    {
                        foreach (var r in s.ReponseValues)
                            _quizDbContext.ReponseDetails.RemoveRange(r.ReponseDetails);
                        _quizDbContext.ReponseValues.RemoveRange(s.ReponseValues);
                    }
                    _quizDbContext.Sessions.RemoveRange(rp.Sessions);
                    _quizDbContext.Comments.RemoveRange(rp.Comments);
                    _quizDbContext.Timelines.RemoveRange(rp.Timelines);
                }
                foreach (var s in application.Sessions)
                {
                    foreach (var r in s.ReponseValues)
                        _quizDbContext.ReponseDetails.RemoveRange(r.ReponseDetails);
                    _quizDbContext.ReponseValues.RemoveRange(s.ReponseValues);
                }

                _quizDbContext.Sessions.RemoveRange(application.Sessions);
                _quizDbContext.RecruitementProcesses.RemoveRange(application.RecruitementProcesses);
                _quizDbContext.AiResults.RemoveRange(application.AiResults);
                _quizDbContext.HistoriqueApplications.RemoveRange(application.HistoriqueApplications);
                _quizDbContext.Applications.Remove(application);

                // CandidateReview référence Application (FK NO_ACTION) mais n'a pas d'entité EF
                // (table non mappée dans le DbContext) : suppression en SQL brut, AVANT le
                // SaveChanges qui supprime l'Application (NO_ACTION refuse sinon la suppression
                // du parent tant qu'une ligne enfant existe).
                await _quizDbContext.Database.ExecuteSqlInterpolatedAsync(
                    $"DELETE FROM CandidateReview WHERE ApplicationId = {Id}");

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "DeleteApplication");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur de suppression d'application.", e);
            }
        }

        public async Task<Application?> UpdatetApplication(Application application)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (application == null)
                    return null;

                _quizDbContext.Applications.Update(application);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return application;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "UpdatetApplication");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur de mise à jour d'application.", e);
            }
        }

        public async Task<Application?> GetApplicationByID(int applicationId)
        {
            try
            {
                var app = await _quizDbContext.Applications
                .Select(a => new Application
                {
                    ApplicationId = a.ApplicationId,
                    ApplicationDate = a.ApplicationDate,
                    CvPath = a.CvPath,
                    Email = a.Email,
                    IdState = a.IdState,
                    JobPostingId = a.JobPostingId,
                    UserId = a.UserId,
                    PhoneNumber = a.PhoneNumber,
                    NameApplication = a.NameApplication,
                    FinalScore = a.FinalScore,
                    HrScore = a.HrScore,
                    TechScore = a.TechScore,
                    TestScore = a.TestScore,
                    AdminDecision = a.AdminDecision,
                    JobPosting = a.JobPosting != null ? new JobPosting()
                    {
                        JobPostingId = a.JobPosting.JobPostingId,
                        PositionTitle = a.JobPosting.PositionTitle,
                        ApplicationDeadline = a.JobPosting.ApplicationDeadline,
                        DatePosted = a.JobPosting.DatePosted,
                        Description = a.JobPosting.Description,
                        Location = a.JobPosting.Location,
                        Requirements = a.JobPosting.Requirements
                    } : null,
                    RecruitementProcesses = a.RecruitementProcesses.Select(r => new RecruitementProcess()
                    {
                        RecruitementProcessId = r.RecruitementProcessId,
                        DatePlanification = r.DatePlanification,
                        ApplicationId = r.ApplicationId,
                        EvaCommentaire = r.EvaCommentaire,
                        EvaNote = r.EvaNote,
                        DataEva = r.DataEva,    
                        Deadline = r.Deadline,
                        LastUpdateDate = r.LastUpdateDate,
                        UserId = r.UserId,
                        IdPosition = r.IdPosition,
                        IdStatus = r.IdStatus,
                        IdPositionNavigation = r.IdPositionNavigation != null ? new Pipline()
                        {
                            Id = r.IdPositionNavigation.Id,
                            NamePipline = r.IdPositionNavigation.NamePipline,
                            Active = r.IdPositionNavigation.Active
                        }
                        : null,
                        IdStatusNavigation = r.IdStatusNavigation != null ? new Status()
                        {
                            IdStatus = r.IdStatusNavigation.IdStatus,
                            NameStatus = r.IdStatusNavigation.NameStatus,
                            ColorS = r.IdStatusNavigation.ColorS
                        } : null,
                        Comments = r.Comments.Select(c => new Comment()
                        {
                            Id = c.Id,                      
                            RecruitementProcessId = c.RecruitementProcessId,
                            Text = c.Text
                        }).ToList(),

                        User = r.User != null ? new User()
                        {
                            UserId = r.User.UserId,
                            Adresse = r.User.Adresse,
                            Email = r.User.Email,
                            Etat = r.User.Etat,
                            Name = r.User.Name,
                            Password = r.User.Password,
                            Prename = r.User.Prename,
                            RoleId = r.User.RoleId,
                            Telephone = r.User.Telephone,
                        } : null,
                    }).ToList(),
                    User = a.User != null ? new User()
                    {
                        UserId = a.User.UserId,
                        Adresse = a.User.Adresse,
                        Email = a.User.Email,
                        Etat = a.User.Etat,
                        Name = a.User.Name,
                        Password = a.User.Password,
                        Prename = a.User.Prename,
                        RoleId = a.User.RoleId,
                        Telephone = a.User.Telephone,
                    } : null
                }).FirstOrDefaultAsync(u => u.ApplicationId == applicationId);

                // Auto-refresh score after fetch (for next view)
                await RefreshApplicationScore(applicationId);

                return app;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "GetApplicationByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur lors de la récupération de l'application par ID.", e);
            }
        }

        public async Task<List<Application>?> GetApplications(int state)
        {
            try
            {
                return await _quizDbContext.Applications

                    .Include(a => a.User)
                    .Include(a => a.RecruitementProcesses)
                    .ThenInclude(rp => rp.IdPositionNavigation)
                    .Include(a => a.JobPosting)
                    .Where(a => a.JobPosting != null && a.IdState == state)
                    .ToListAsync();
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "GetApplications");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur lors de la récupération des applications.", e);
            }
        }

        public async Task<List<State>> GetStates()
        {
            return await _quizDbContext.States.ToListAsync();
        }

        // public async Task<List<ApplicationByState>?> GetApplicationsProcess(int state)
        // {
        //     try
        //     {   
        //         List<ApplicationByState> ListapplicationByState = new List<ApplicationByState>();

        //         var listApplications = await _quizDbContext.Applications.Where(x=> x.State == state)
        //         .Select(x => new Application(){
        //             ApplicationId =  x.ApplicationId,
        //             JobPostingId =  x.JobPostingId,
        //             ApplicationDate =  x.ApplicationDate,
        //             NameApplication = x.NameApplication,
        //             UserId =  x.UserId,
        //             State =  x.State,
        //             JobPosting =  x.JobPosting,
        //         }).ToListAsync();
        //         foreach(Application application in listApplications){
        //             if(application != null){
        //             ApplicationByState ? applicationByStatenew = new ApplicationByState();
        //             applicationByStatenew!.Application = application  ;
        //             applicationByStatenew!.RecruitementProcesses =  await 
        //                 _quizDbContext.RecruitementProcesses
        //                 .Select(x=> new RecruitementProcess(){
        //                     RecruitementProcessId = x.RecruitementProcessId,
        //                     DatePlanification = x.DatePlanification,
        //                     ApplicationId = x.ApplicationId,
        //                     UserId = x.UserId,
        //                     IdPosition = x.IdPosition,
        //                     IdStatus = x.IdStatus,
        //                     Note = x.Note,
        //                     LastUpdateDate = x.LastUpdateDate,  
        //                 })
        //                 .Where(x=> x.ApplicationId == application.ApplicationId)
        //                 .OrderByDescending(x => x.LastUpdateDate)//LastUpdateDate
        //                 .FirstOrDefaultAsync();
        //             applicationByStatenew.Status = await _quizDbContext.Statuses.FindAsync( applicationByStatenew.RecruitementProcesses!.IdStatus);
        //             applicationByStatenew.Position = await _quizDbContext.Pipline.FindAsync( applicationByStatenew.RecruitementProcesses!.IdPosition);
        //                 ListapplicationByState.Add(applicationByStatenew);
        //             }
        //         }

        //         return ListapplicationByState;
        //     } 
        //     catch (Exception e)
        //     {
        //         ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "GetApplications");
        //         ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
        //         throw new ApplicationException("Erreur lors de la récupération des applications.", e);
        //     }
        // }



        public async Task<List<Application>?> GetApplicationsSansRecrutement()
        {
            try
            {
                return await _quizDbContext.Applications
                    .Include(u => u.User)
                    .Include(a => a.JobPosting)
                    .Include(u => u.RecruitementProcesses).ThenInclude(x => x.IdPositionNavigation)
                    .Include(d => d.RecruitementProcesses).ThenInclude(x => x.IdStatusNavigation)
                    .ToListAsync();
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "GetApplicationsSansRecrutement");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur lors de la récupération des applications sans recrutement.", e);
            }
        }

        public async Task<Application?> GetApplicationSansRecrutementById(int id)
        {
            try
            {
                return await _quizDbContext.Applications
                    .Include(u => u.User)
                    .Include(a => a.JobPosting)
                    .Include(u => u.RecruitementProcesses).ThenInclude(x => x.IdPositionNavigation)
                    .Include(d => d.RecruitementProcesses).ThenInclude(x => x.IdStatusNavigation)
                    .FirstOrDefaultAsync();
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "GetApplicationSansRecrutementById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur lors de la récupération de l'application sans recrutement par ID.", e);
            }
        }

        public async Task<Application?> ActionsAcceptRefuse(Actions actions)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (actions.idApp == 0)
                    return null;

                Application? application = await _quizDbContext.Applications.Where(x => x.ApplicationId == actions.idApp).FirstOrDefaultAsync();
                RecruitementProcess? recruitementProcess = await _quizDbContext.RecruitementProcesses.Where(x => x.ApplicationId == actions.idApp && x.IdPosition == 1).FirstOrDefaultAsync();

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return application;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ApplicationService", "UpdatetApplication");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Erreur de mise à jour d'application.", e);
            }
        }
        public async Task<Application?> UpdateApplicationState(int applicationId, int newState)
        {
            // L'admin/RH peut approuver OU refuser librement une candidature : refuser
            // ne doit pas exiger que le candidat ait passé des tests/entretiens.
            // (Ancienne règle bloquante retirée — elle cassait les boutons Accepter/Refuser.)

            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                Application? application = await _quizDbContext.Applications.FindAsync(applicationId);
                if (application == null)
                    return null;
                
                application.IdState = newState;
                
                if (newState == 1) application.AdminDecision = "Pending";
                else if (newState == 2) application.AdminDecision = "Accepted";
                else if (newState == 3) application.AdminDecision = "In Progress";
                else if (newState == 4) application.AdminDecision = "Rejected";
                
                var hist = new HistoriqueApplication
                {
                    IdApplication = applicationId,
                    IdState = newState,
                    DateHist = DateTime.Now
                };
                await _quizDbContext.HistoriqueApplications.AddAsync(hist);

                // (Ancien insert de RecruitementProcess retiré : IdPosition=1006 était une
                //  FK invalide -> l'acceptation échouait en 400. Le changement d'état suffit.)

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return application;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                throw new ApplicationException($"Erreur de mise à jour de l'état de l'application: {e.Message}", e);
            }
        }

        public Task<List<ApplicationByState>?> GetApplicationsProcess(int state)
        {
            throw new NotImplementedException();
        }

        public async Task<List<AppliDto>?> GetAllApplications(int? departmentId = null, int page = 1, int pageSize = 10)
        {
            try
            {
                var query = _quizDbContext.Applications.AsQueryable();

                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    query = query.Where(a => a.JobPosting != null && a.JobPosting.DepartmentId == departmentId.Value);
                }

                List<AppliDto> Apps = await query
                .OrderByDescending(a => a.ApplicationDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AppliDto
                {
                    ApplicationId = a.ApplicationId,
                    ApplicationDate = a.ApplicationDate,
                    CvPath = a.CvPath,
                    Email = a.Email,
                    IdState = a.IdState,
                    JobPostingId = a.JobPostingId,
                    UserId = a.UserId,
                    AssignedTeamLeaderId = a.AssignedTeamLeaderId,
                    PhoneNumber = a.PhoneNumber,
                    NameApplication = a.NameApplication,
                    HrScore = a.HrScore,
                    TechScore = a.TechScore,
                    TestScore = a.TestScore,
                    FinalScore = a.FinalScore,
                    AdminDecision = a.AdminDecision,
                    IsRecommended = a.IsRecommended,
                    RawAiResult = a.AiResults.OrderByDescending(ar => ar.IdResultAi).Select(ar => ar.Result).FirstOrDefault(),
                    TestsCompleted = a.Sessions.Count(s => s.SessionState == true),
                    TotalTests = a.Sessions.Count(),
                    InterviewsCompleted = a.RecruitementProcesses.Count(rp => rp.EvaNote.HasValue),
                    TotalInterviews = a.RecruitementProcesses.Count(),
                    User = a.User != null ? new User()
                    {
                        UserId = a.User.UserId,
                        Name = a.User.Name,
                        Prename = a.User.Prename,
                        Email = a.User.Email,
                        Telephone = a.User.Telephone,
                    } : null,
                    JobPosting = a.JobPosting != null ? new JobPosting()
                    {
                        JobPostingId = a.JobPosting.JobPostingId,
                        PositionTitle = a.JobPosting.PositionTitle,
                        ApplicationDeadline = a.JobPosting.ApplicationDeadline,
                        DatePosted = a.JobPosting.DatePosted,
                        Description = a.JobPosting.Description,
                        Location = a.JobPosting.Location,
                        Requirements = a.JobPosting.Requirements
                    } : null,
                    RecruitementProcesses = a.RecruitementProcesses.Select(r => new RecruitementProcess()
                    {
                        RecruitementProcessId = r.RecruitementProcessId,
                        DatePlanification = r.DatePlanification,
                        ApplicationId = r.ApplicationId,
                        EvaCommentaire = r.EvaCommentaire,
                        EvaNote = r.EvaNote,
                        DataEva = r.DataEva,
                        Deadline = r.Deadline,
                        LastUpdateDate = r.LastUpdateDate,
                        UserId = r.UserId,
                        IdPosition = r.IdPosition,
                        IdStatus = r.IdStatus,
                        Final=r.Final,
                    }).ToList(),
                    IdStateNavigation = a.IdStateNavigation != null ? new State {
                        IdState = a.IdStateNavigation.IdState,
                        NameState = a.IdStateNavigation.NameState
                    } : null
                })
                .ToListAsync();

                if (Apps == null) return null;

                // Post-process scores in memory to handle complex string parsing safely
                foreach (var app in Apps)
                {
                    if (!string.IsNullOrEmpty(app.RawAiResult))
                    {
                        // Use regex to find the first number (e.g., 91.22, 91,22, or 91)
                        var match = System.Text.RegularExpressions.Regex.Match(app.RawAiResult, @"\d+([.,]\d+)?");
                        if (match.Success)
                        {
                            var val = match.Value.Replace(',', '.');
                            if (double.TryParse(val, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var score))
                            {
                                // If the AI returns a value like 9122 (missing dot), we normalize it.
                                // We check for values between 101 and 10000.
                                if (score > 100.0 && score < 10000.0) score = score / 100.0;
                                else if (score >= 10000.0) score = 100.0; // Cap at 100
                                
                                app.CvScore = (decimal)score;
                            }
                        }
                    }
                }

                foreach (var appli in Apps)
                {
                    RecruitementProcess? RP = await _quizDbContext.RecruitementProcesses
                    .Where(r => r.ApplicationId == appli.ApplicationId)
                    .OrderByDescending(o => o.RecruitementProcessId)
                    .Select(r => new RecruitementProcess()
                    {
                        RecruitementProcessId = r.RecruitementProcessId,
                        DatePlanification = r.DatePlanification,
                        ApplicationId = r.ApplicationId,
                        EvaCommentaire = r.EvaCommentaire,
                        EvaNote = r.EvaNote,
                        DataEva = r.DataEva,
                        Deadline = r.Deadline,
                        LastUpdateDate = r.LastUpdateDate,
                        UserId = r.UserId,
                        IdPosition = r.IdPosition,
                        IdStatus = r.IdStatus,
                        Final= r.Final,
                        IdPositionNavigation = r.IdPositionNavigation != null ? new Pipline()
                        {
                            Id = r.IdPositionNavigation.Id,
                            NamePipline  = r.IdPositionNavigation.NamePipline,
                            Active = r.IdPositionNavigation.Active
                        }
                        : null
                    })
                    .FirstOrDefaultAsync();

                    if (RP != null)
                    {
                        Status? lstatus = await _quizDbContext.Statuses
                        .Where(s => s.IdStatus == RP!.IdStatus)
                        .FirstOrDefaultAsync();

                        if (lstatus != null)
                        {
                            appli.LastStatus = lstatus;
                            appli.RecProcess = RP;
                        }
                    }
                }

                return Apps;
            }
            catch (Exception e)
            {

                throw new Exception("error", e);
            }
        }

        public async Task<int> GetTotalApplicationsCount(int? departmentId = null)
        {
            var query = _quizDbContext.Applications.AsQueryable();
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                query = query.Where(a => a.JobPosting != null && a.JobPosting.DepartmentId == departmentId.Value);
            }
            return await query.CountAsync();
        }

        public async Task AddApplicationWithAiResult(AppWithAiResultDto application)
        {
            if (application == null)
            {
                throw new ArgumentNullException(nameof(application), "Application data cannot be null.");
            }

            await using var transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                var appli = new Application
                {
                    JobPostingId = application.AppData.JobPostingId,
                    ApplicationDate = application.AppData.ApplicationDate,
                    UserId = application.AppData.UserId,
                    IdState = application.AppData.IdState,
                    CvPath = application.AppData.CvPath,
                    NameApplication = application.AppData.NameApplication,
                    Email = application.AppData.Email,
                    PhoneNumber = application.AppData.PhoneNumber,
                };

                await _quizDbContext.Applications.AddAsync(appli);
                await _quizDbContext.SaveChangesAsync();

                var hist = new HistoriqueApplication
                {
                    IdApplication = appli.ApplicationId,
                    IdState = appli.IdState,
                    DateHist = DateTime.Now
                };

                await _quizDbContext.HistoriqueApplications.AddAsync(hist);
                await _quizDbContext.SaveChangesAsync();

                var aiRes = new AiResult
                {
                    ApplicationId = appli.ApplicationId,
                    Result = application.AiData.Result
                };

                await _quizDbContext.AiResults.AddAsync(aiRes);
                await _quizDbContext.SaveChangesAsync();

                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<(double score, string status)> AnalyzeCvWithService(string cvPath, int jobPostingId)
        {
            try
            {
                // Try calling the persistent FastAPI service
                Console.WriteLine($"[AI] Tentative d'appel du service persistent sur port 8000 pour {cvPath}");
                var response = await _httpClient.GetAsync($"http://localhost:8000/analyze?cv_path={Uri.EscapeDataString(cvPath)}&job_id={jobPostingId}");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<JsonElement>(content);
                    double score = result.GetProperty("score").GetDouble();
                    string status = result.GetProperty("status").GetString() ?? "Unknown";
                    Console.WriteLine($"[AI] Service persistent répondu en <1s: Score={score}");
                    return (score, status);
                }
                
                Console.WriteLine($"[AI] Service persistent a retourné {response.StatusCode}. Fallback vers legacy.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AI] Service persistent non disponible ({ex.Message}). Fallback vers legacy.");
            }

            // Fallback to the slow legacy method (Process.Start)
            return await AnalyzeCvWithPython(cvPath, jobPostingId);
        }

        private async Task<(double score, string status)> AnalyzeCvWithPython(string cvPath, int jobPostingId)
        {
            try
            {
                string scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "AnalyseCv.py");
                string absoluteCvPath = Path.IsPathRooted(cvPath) ? cvPath : Path.Combine(Directory.GetCurrentDirectory(), "Resources", "Cv", cvPath);

                var startInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = $"\"{scriptPath}\" \"{absoluteCvPath}\" {jobPostingId}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    StandardOutputEncoding = System.Text.Encoding.UTF8,
                    StandardErrorEncoding = System.Text.Encoding.UTF8
                };
                
                startInfo.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";

                using (var process = System.Diagnostics.Process.Start(startInfo))
                {
                    if (process == null) return (0, "Error: Could not start process");

                    string output = await process.StandardOutput.ReadToEndAsync();
                    string error = await process.StandardError.ReadToEndAsync();
                    process.WaitForExit();

                    // Print all stderr as debug info
                    if (!string.IsNullOrWhiteSpace(error))
                    {
                        Console.WriteLine($"[AI DEBUG (stderr)]: {error}");
                    }

                    if (process.ExitCode != 0)
                    {
                        return (0, $"Error: Script failed with code {process.ExitCode}");
                    }

                    // Process stdout line by line to find the JSON result
                    string jsonResult = "";
                    var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var line in lines)
                    {
                        if (line.Trim().StartsWith("{") && line.Trim().EndsWith("}"))
                        {
                            jsonResult = line.Trim();
                        }
                        else
                        {
                            Console.WriteLine($"[AI DEBUG (stdout)]: {line}");
                        }
                    }

                    if (string.IsNullOrWhiteSpace(jsonResult))
                    {
                        return (0, "Error: No JSON result found in output");
                    }

                    try
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var result = JsonSerializer.Deserialize<JsonElement>(jsonResult, options);
                        
                        if (result.ValueKind == JsonValueKind.Object && result.TryGetProperty("score", out var scoreElement))
                        {
                            double score = scoreElement.GetDouble();
                            string status = result.GetProperty("status").GetString() ?? "Unknown";
                            return (score, status);
                        }
                        
                        return (0, "Error: Invalid JSON structure");
                    }
                    catch (JsonException jex)
                    {
                        Console.WriteLine($"[AI] JSON Parse Error: {jex.Message}. Content was: {jsonResult}");
                        return (0, "Error: Could not parse AI result");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AI] Integration Error: {ex.Message}");
                return (0, "Error: Exception occurred");
            }
        }

        public async Task ApplyCandidate(CandidateApplyDto applyDto)
        {
            Console.WriteLine($"[Apply] Démarrage candidature pour: {applyDto.Email}");
            await using var transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                // 1. Validation
                long phoneNum = 0;
                if (!string.IsNullOrEmpty(applyDto.Phone)) {
                    var digits = new string(applyDto.Phone.Where(char.IsDigit).ToArray());
                    if (long.TryParse(digits, out long p)) phoneNum = p;
                }
                
                Console.WriteLine($"[Apply] Check doublons - Email: {applyDto.Email}, Phone: {phoneNum}");
                var existingApp = await _quizDbContext.Applications
                    .FirstOrDefaultAsync(a => a.Email == applyDto.Email || (a.PhoneNumber != null && a.PhoneNumber == (int)phoneNum));
                
                if (existingApp != null)
                {
                    Console.WriteLine("[Apply] ERREUR: Doublon détecté");
                    throw new Exception("Vous avez déjà postulé avec cet email ou ce numéro de téléphone.");
                }

                // 2. Candidate
                Console.WriteLine("[Apply] Étape 2: Création/Récupération candidat");
                var candidate = await _quizDbContext.Candidates.FirstOrDefaultAsync(c => c.Email == applyDto.Email);
                if (candidate == null)
                {
                    candidate = new Candidate
                    {
                        FirstName = applyDto.FirstName,
                        LastName = applyDto.LastName,
                        Email = applyDto.Email,
                        Phone = applyDto.Phone,
                        CreatedAt = DateTime.Now
                    };
                    await _quizDbContext.Candidates.AddAsync(candidate);
                    await _quizDbContext.SaveChangesAsync();
                }

                // 4. CV File
                Console.WriteLine("[Apply] Étape 4: Sauvegarde du CV");
                string cvFileName = $"{Guid.NewGuid()}_{applyDto.Cv.FileName}";
                string relativePath = Path.Combine("Resources", "Cv");
                string absoluteDirectory = Path.Combine(Directory.GetCurrentDirectory(), relativePath);
                
                if (!Directory.Exists(absoluteDirectory)) Directory.CreateDirectory(absoluteDirectory);
                string absoluteFilePath = Path.Combine(absoluteDirectory, cvFileName);

                using (var stream = new FileStream(absoluteFilePath, FileMode.Create))
                {
                    await applyDto.Cv.CopyToAsync(stream);
                }

                // 4.1 AI Analysis (Optimized Stage)
                Console.WriteLine("[Apply] Étape 4.1: Analyse AI du CV");
                var (aiScore, aiStatus) = await AnalyzeCvWithService(cvFileName, applyDto.JobPostingId);
                Console.WriteLine($"[Apply] Score AI: {aiScore}% - Statut: {aiStatus}");

                bool isAcceptedByAi = aiScore >= 75;

                // 3. User Account (Moved after AI analysis to decide if credentials should be sent)
                Console.WriteLine("[Apply] Étape 3: Création compte utilisateur");
                var user = await _quizDbContext.Users.FirstOrDefaultAsync(u => u.Email == applyDto.Email);
                string generatedPassword = Guid.NewGuid().ToString("N").Substring(0, 8);
                
                if (user == null)
                {
                    var candidateRole = await _quizDbContext.Roles
                        .OrderBy(r => r.RoleId)
                        .FirstOrDefaultAsync(r => r.Description != null && (r.Description.ToLower() == "candidate" || r.Description.ToLower() == "candidat"))
                        ?? await _quizDbContext.Roles.OrderBy(r => r.RoleId).FirstOrDefaultAsync();

                    if (candidateRole == null) throw new Exception("Aucun rôle disponible dans la base de données.");

                    user = new User
                    {
                        Name = applyDto.FirstName,
                        Prename = applyDto.LastName,
                        Email = applyDto.Email,
                        Password = generatedPassword,
                        Telephone = applyDto.Phone,
                        RoleId = candidateRole.RoleId,
                        Etat = true
                    };
                    await _quizDbContext.Users.AddAsync(user);
                    await _quizDbContext.SaveChangesAsync();

                    if (isAcceptedByAi)
                    {
                        try {
                            await _emailService.SendCredentialsEmail(user.Email, $"{user.Name} {user.Prename}", generatedPassword, candidateRole.Description ?? "Candidat");
                            Console.WriteLine("[Apply] Email envoyé avec succès");
                        } catch (Exception ex) {
                            Console.WriteLine($"[Apply] WARNING: Email non envoyé: {ex.Message}");
                        }
                    }
                    else
                    {
                        Console.WriteLine("[Apply] AI Refus: Pas d'envoi d'identifiants");
                    }
                }

                // US5: Email de refus automatique si le CV n'est pas compatible (score IA < 75)
                if (!isAcceptedByAi)
                {
                    try
                    {
                        var rejectedJob = await _quizDbContext.JobPostings
                            .FirstOrDefaultAsync(j => j.JobPostingId == applyDto.JobPostingId);
                        var positionTitle = rejectedJob?.PositionTitle ?? "le poste";
                        await _emailService.SendRejectionEmail(
                            applyDto.Email,
                            $"{applyDto.FirstName} {applyDto.LastName}",
                            positionTitle);
                        Console.WriteLine("[Apply] Email de refus envoyé avec succès");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Apply] WARNING: Email de refus non envoyé: {ex.Message}");
                    }
                }

                var candidateCV = new CandidateCV
                {
                    CandidateId = candidate.CandidateId,
                    CVPath = cvFileName,
                    UploadDate = DateTime.Now
                };
                await _quizDbContext.CandidateCVs.AddAsync(candidateCV);
                await _quizDbContext.SaveChangesAsync();

                // 5. Application
                Console.WriteLine("[Apply] Étape 5: Création de l'application finale");
                var application = new Application
                {
                    JobPostingId = applyDto.JobPostingId,
                    CandidateId = candidate.CandidateId,
                    UserId = user.UserId,
                    CVId = candidateCV.CVId,
                    ApplicationDate = DateTime.Now,
                    IdState = isAcceptedByAi ? 1 : 4, // 1: Initial, 4: Refused
                    NameApplication = $"{applyDto.FirstName} {applyDto.LastName}",
                    Email = applyDto.Email,
                    PhoneNumber = (int?)(phoneNum > 2147483647 ? 0 : phoneNum),
                    CvPath = cvFileName,
                    AdminDecision = isAcceptedByAi ? "Pending" : "Rejected (Auto AI)"
                };

                await _quizDbContext.Applications.AddAsync(application);
                await _quizDbContext.SaveChangesAsync();

                // 5.1 Save AI Result
                var aiResult = new AiResult
                {
                    ApplicationId = application.ApplicationId,
                    Result = $"{aiScore}% - {aiStatus}"
                };
                await _quizDbContext.AiResults.AddAsync(aiResult);
                await _quizDbContext.SaveChangesAsync();

                // 6. History
                var hist = new HistoriqueApplication
                {
                    IdApplication = application.ApplicationId,
                    IdState = application.IdState,
                    DateHist = DateTime.Now
                };
                await _quizDbContext.HistoriqueApplications.AddAsync(hist);
                await _quizDbContext.SaveChangesAsync();

                // 6.1 Assign Team Leader
                try {
                    await AssignTeamLeaderToApplication(application);
                    await _quizDbContext.SaveChangesAsync();
                } catch (Exception tlEx) {
                    Console.WriteLine($"[Apply] WARNING: TL Assignment failed: {tlEx.Message}");
                }

                // 6.2 Refresh Score
                await RefreshApplicationScore(application.ApplicationId);

                await transaction.CommitAsync();
                Console.WriteLine("[Apply] SUCCÈS: Candidature terminée");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Apply] ERREUR CRITIQUE: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"[Apply] INNER: {ex.InnerException.Message}");
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task AssignTeamLeaderToApplication(Application application)
        {
            try
            {
                var jobPosting = await _quizDbContext.JobPostings.FindAsync(application.JobPostingId);
                if (jobPosting == null || jobPosting.DepartmentId == null) return;

                // Find users in the same department who are Team Leaders
                var teamLeaders = await _quizDbContext.Users
                    .Include(u => u.Role)
                    .Where(u => u.DepartmentId == jobPosting.DepartmentId &&
                               (u.Role != null && (u.Role.Description.ToLower().Contains("team leader") ||
                                u.Role.Description.ToLower().Contains("teamleader") ||
                                u.Role.Description.ToLower().Contains("chef d'équipe"))))
                    .ToListAsync();

                if (!teamLeaders.Any()) {
                    Console.WriteLine($"[Apply] No Team Leaders found for department {jobPosting.DepartmentId}");
                    return;
                }

                var tlIds = teamLeaders.Select(tl => tl.UserId).ToList();
                
                // Find the TL with the least number of assigned applications
                var tlLoads = await _quizDbContext.Applications
                    .Where(a => a.AssignedTeamLeaderId.HasValue && tlIds.Contains(a.AssignedTeamLeaderId.Value))
                    .GroupBy(a => a.AssignedTeamLeaderId)
                    .Select(g => new { TLId = g.Key!.Value, Count = g.Count() })
                    .ToListAsync();

                var bestTL = teamLeaders
                    .OrderBy(tl => tlLoads.FirstOrDefault(l => l.TLId == tl.UserId)?.Count ?? 0)
                    .First();

                application.AssignedTeamLeaderId = bestTL.UserId;
                Console.WriteLine($"[Apply] Application assigned to Team Leader: {bestTL.Name} (ID: {bestTL.UserId})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Apply] ERROR in AssignTeamLeaderToApplication: {ex.Message}");
            }
        }

        public async Task UpdateRecommendation(int applicationId, bool isRecommended)
        {
            var application = await _quizDbContext.Applications.FindAsync(applicationId);
            if (application != null)
            {
                application.IsRecommended = isRecommended;
                await _quizDbContext.SaveChangesAsync();
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
            }

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

            // 4. Final score calculation (weighted average based on available data)
            int count = 0;
            double sum = 0;
            
            if (cvScore.HasValue) { sum += cvScore.Value; count++; }
            if (testAvg.HasValue) { sum += testAvg.Value; count++; }
            if (interviewAvg.HasValue) { sum += interviewAvg.Value; count++; }

            double finalScore = count > 0 ? sum / count : 0.0;

            application.TestScore = testAvg.HasValue ? (int)Math.Round(testAvg.Value) : null;
            application.HrScore = interviewAvg.HasValue ? (int)Math.Round(interviewAvg.Value) : null;
            application.TechScore = application.TestScore;
            application.FinalScore = (decimal)finalScore;

            _quizDbContext.Applications.Update(application);
            await _quizDbContext.SaveChangesAsync();
        }

        public async Task ReassignTeamLeader(int applicationId, int teamLeaderId)
        {
            var application = await _quizDbContext.Applications.FindAsync(applicationId);
            if (application == null) throw new KeyNotFoundException("Application not found");

            application.AssignedTeamLeaderId = teamLeaderId;
            await _quizDbContext.SaveChangesAsync();
        }
    }
}
