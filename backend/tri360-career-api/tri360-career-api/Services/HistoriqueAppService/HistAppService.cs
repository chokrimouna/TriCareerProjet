namespace Quizback.Services
{
    public class HistAppService : IHistService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public HistAppService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<HistoriqueApplication>?> GetAllHists()
        {
            try
            {
                List<HistoriqueApplication> Hists = await _dbContext.HistoriqueApplications.ToListAsync();
                return Hists;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "HistService", "GetAllhists");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<HistoriqueApplication?> GetHistById(int histId)
        {
            try
            {
                HistoriqueApplication? hist = await _dbContext.HistoriqueApplications.FirstOrDefaultAsync(l => l.IdHistorique == histId);
                return hist;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "histService", "GethistById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task AddHist(HistoriqueApplication hist)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (hist == null)
                    throw new ArgumentNullException(nameof(hist), "Level cannot be null");

                _dbContext.HistoriqueApplications.Add(hist);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "HistService", "AddHist");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task UpdateHist(HistoriqueApplication hist)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (hist == null)
                    throw new ArgumentNullException(nameof(hist), "Level cannot be null");

                _dbContext.HistoriqueApplications.Update(hist);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "HistService", "UpdateHistorique");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task DeleteHist(int hist)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                HistoriqueApplication? historique = await _dbContext.HistoriqueApplications.FindAsync(hist);
                if (historique == null)
                    throw new ArgumentException("Level not found", nameof(hist));

                _dbContext.HistoriqueApplications.Remove(historique);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "HistoriqueService", "DeleteHistorique");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<HistoriqueApplication?> GetlastHistByIdApp(int IdApp)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                HistoriqueApplication? hist = await _dbContext.HistoriqueApplications
                .Where(h => h.IdApplication == IdApp)
                .OrderByDescending(h => h.IdHistorique)
                .FirstOrDefaultAsync();
                return hist;
            }
            catch (System.Exception)
            {
                
                throw;
            }
        }
    }
}
