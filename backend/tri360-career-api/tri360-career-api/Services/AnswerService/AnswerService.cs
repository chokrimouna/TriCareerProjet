namespace Quizback.Services
{
    public class AnswerService : IAnswerService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public AnswerService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<Answer>?> GetAllAnswers()
        {
            try
            {
                List<Answer> answers = await _dbContext.Answers.ToListAsync();
                return answers;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "GetAllAnswers");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

        public async Task<Answer?> GetAnswerById(int answerId)
        {
            try
            {
                Answer? answer = await _dbContext.Answers.FirstOrDefaultAsync(a => a.Id == answerId);
                return answer;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "GetAnswerById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

        public async Task AddAnswer(Answer answer)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (answer == null)
                    throw new ArgumentNullException(nameof(answer), "Answer null");
                
                _dbContext.Answers.Add(answer);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "AddAnswer");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

        public async Task UpdateAnswer(Answer answer)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (answer == null)
                    throw new ArgumentNullException(nameof(answer), "Answer null");
                
                _dbContext.Answers.Update(answer);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "UpdateAnswer");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

        public async Task DeleteAnswer(int answerId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                Answer? answer = await _dbContext.Answers.FindAsync(answerId);
                if (answer == null)
                    throw new ArgumentNullException("DetailsExaman null");
                
                _dbContext.Answers.Remove(answer);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "DeleteAnswer");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

        public async Task<List<Answer>?> GetAnswersByQuestionId(int questionId)
        {
            try
            {
                List<Answer> answers = await _dbContext.Answers.Where(a => a.IdQuestion == questionId).ToListAsync();
                return answers;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "GetAnswersByQuestionId");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }
    }
}
