namespace Quizback.Services
{
    public class ExamanService : IExamanService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public ExamanService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<Examan>?> GetAllExamen(int? departmentId = null)
        {
            try
            {
                var query = _dbContext.Examen.Where(ex => ex.Active == true);

                Console.WriteLine($"GetAllExamen called with departmentId: {departmentId}");
                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    query = query.Where(ex => ex.User != null && ex.User.DepartmentId == departmentId.Value);
                }

                List<Examan> examens = await query
                    .Select(e => new Examan
                    {
                        IdExaman = e.IdExaman,
                        Titre = e.Titre,
                        Description = e.Description,
                        Active = e.Active,
                        DateCreation = e.DateCreation,
                        UserId = e.UserId,
                        User = e.User != null ? new User
                        {
                            UserId = e.User.UserId,
                            Name = e.User.Name,
                            Prename = e.User.Prename
                        } : null,
                        DetailsExamen = e.DetailsExamen.Select(d => new DetailsExaman
                        {
                            IdDetailExaman = d.IdDetailExaman,
                            IdExaman = d.IdExaman,
                            IdQuestion = d.IdQuestion,
                            IdQuestionNavigation = d.IdQuestionNavigation != null ? new Question
                            {
                                IdQuestion = d.IdQuestionNavigation.IdQuestion,
                                NameQuestion = d.IdQuestionNavigation.NameQuestion,
                                Answers = d.IdQuestionNavigation.Answers.Select(a => new Answer
                                {
                                    Id = a.Id,
                                    Label = a.Label,
                                    IsCorrect = a.IsCorrect
                                }).ToList()
                            } : null
                        }).ToList()
                    })
                    .ToListAsync();
                return examens;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "GetAllExamen");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }


        public async Task<Examan?> GetExamanById(int examanId)
        {
            try
            {
                Examan? examan = await _dbContext.Examen
                    .Include(e => e.User)
                    .Include(e => e.DetailsExamen)
                        .ThenInclude(d => d.IdQuestionNavigation)
                            .ThenInclude(q => q.Answers)
                    .FirstOrDefaultAsync(e => e.IdExaman == examanId);

                return examan;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "GetExamenById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Remarque : Vous devrez peut-être ajuster cela pour gérer correctement l'exception dans votre application.
            }
        }


        public async Task<Examan?> AddExaman(Examan examan)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (examan == null) throw new ArgumentNullException(nameof(examan));

                _dbContext.Examen.Add(examan);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return examan; // EF Core populates IdExaman after SaveChanges
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "AddExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        public async Task UpdateExaman(Examan examan)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (examan == null) throw new ArgumentNullException(nameof(examan));

                _dbContext.Examen.Update(examan);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "UpdateExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Remarque : Vous devrez peut-être ajuster cela pour gérer correctement l'exception dans votre application.
            }
        }

        public async Task DeleteExaman(int examanId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                // 1. Find the exam
                Examan? examan = await _dbContext.Examen
                    .Include(e => e.DetailsExamen)
                    .Include(e => e.Sessions)
                    .FirstOrDefaultAsync(e => e.IdExaman == examanId);
                    
                if (examan == null) throw new InvalidOperationException("Examan non trouvé.");

                // 2. Delete DetailsExamen associations
                if (examan.DetailsExamen.Any())
                {
                    _dbContext.DetailsExamen.RemoveRange(examan.DetailsExamen);
                }

                // 3. Handle Sessions (Soft delete sessions or delete them)
                // If we want hard delete of Examan, we must handle sessions too.
                // For safety, let's delete sessions if they don't have responses, or just delete them all if hard delete is requested.
                if (examan.Sessions.Any())
                {
                    foreach (var session in examan.Sessions)
                    {
                         // Delete related ResponseValues and their details first
                        var responses = await _dbContext.ReponseValues.Where(r => r.IdSession == session.SessionId).ToListAsync();
                        foreach (var resp in responses)
                        {
                            var details = _dbContext.ReponseDetails.Where(d => d.IdReponseValue == resp.IdReponse);
                            _dbContext.ReponseDetails.RemoveRange(details);
                        }
                        _dbContext.ReponseValues.RemoveRange(responses);
                    }
                    _dbContext.Sessions.RemoveRange(examan.Sessions);
                }

                // 4. Finally delete the exam
                _dbContext.Examen.Remove(examan);
                
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "DeleteExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw;
            }
        }

        public async Task ExamanDisactivated(int examanId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (examanId == 0) throw new InvalidOperationException("Examan non trouvé.");

                Examan? examan = await _dbContext.Examen.FindAsync(examanId);
                if (examan == null) throw new InvalidOperationException("Examan non trouvé.");

                examan.Active = false;
                _dbContext.Examen.Update(examan);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "ExamanDisactivated");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Remarque : Vous devrez peut-être ajuster cela pour gérer correctement l'exception dans votre application.
            }
        }

        public async Task ExamanActivated(int examanId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (examanId == 0) throw new InvalidOperationException("Examan non trouvé.");

                Examan? examan = await _dbContext.Examen.FindAsync(examanId);
                if (examan == null) throw new InvalidOperationException("Examan non trouvé.");

                examan.Active = true;
                _dbContext.Examen.Update(examan);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "ExamanService", "ExamanActivated");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Remarque : Vous devrez peut-être ajuster cela pour gérer correctement l'exception dans votre application.
            }
        }
    }
}
