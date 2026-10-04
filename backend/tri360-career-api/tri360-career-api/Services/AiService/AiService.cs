namespace Quizback.Services
{
    public class AiService : IAiService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public AiService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<AiResult>?> GetAllAi()
        {
            try
            {
                List<AiResult> Ais = await _dbContext.AiResults.ToListAsync();
                return Ais;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "AnswerService", "GetAllAnswers");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw;
            }
        }

    }
}
