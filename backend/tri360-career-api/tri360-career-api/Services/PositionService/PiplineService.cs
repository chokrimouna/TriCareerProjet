namespace Quizback.Services
{
    public class PiplineService : IPiplineService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connectionString;

        public PiplineService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        #region CRUD Piplines

        public async Task <bool>  AddPipline(Pipline Pipline)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Pipline == null) return false;
                await _quizDbContext.Piplines.AddAsync(Pipline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "PiplineService", "AddPipline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return false;
            }
        }

        public async Task<bool> DeletePipline(int Id)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                Pipline? Pipline = _quizDbContext.Piplines.Find(Id);
                if (Pipline == null) return false;
                _quizDbContext.Piplines.Remove(Pipline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "PiplineService", "DeletePipline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return false;
            }
        }

        public async Task<bool> UpdatePipline(Pipline Pipline)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Pipline == null) return false;
                _quizDbContext.Piplines.Update(Pipline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "PiplineService", "UpdatePipline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return false;
            }
        }

        public async Task<Pipline?> GetPiplineByID(int Id)
        {
            try
            {
                Pipline? Pipline = await _quizDbContext.Piplines.Where(u => u.Id == Id).FirstOrDefaultAsync();
                return Pipline;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "PiplineService", "GetPiplineByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        public async Task<List<Pipline>?> GetPiplines()
        {
            List<Pipline> LPiplinedb = new List<Pipline>();
            try
            {
                 LPiplinedb = await _quizDbContext.Piplines.ToListAsync();
                return LPiplinedb;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "PiplineService", "GetPiplines");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return LPiplinedb;

            }
        }

        #endregion
    }
}