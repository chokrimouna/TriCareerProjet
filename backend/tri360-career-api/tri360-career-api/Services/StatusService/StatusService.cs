namespace Quizback.Services
{
    public class StatusService : IStatusService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connection;

        public StatusService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connection = configuration.GetConnectionString("ConnectionString")!;
        }


        public async Task<bool> AddStatus(Status Status)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Status == null)
                {
                    return false;
                }
                await _quizDbContext.Statuses.AddAsync(Status);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;

            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Statusesrepository", "AddStatus");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }
        }

        public async Task<bool> DeleteStatus(int? StatusId)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (StatusId == 0)
                {
                    return false;
                }
                Status? Status = await _quizDbContext.Statuses.FindAsync(StatusId);
                if (Status == null)
                {
                    return false;
                }
                _quizDbContext.Statuses.Remove(Status);

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Statusesrepository", "DeleteStatus");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e); // developement
                return false;
            }
        }

        public async Task<List<Status>?> GetAllStatuss()
        {
            try
            {
                List<Status> LStatuses = new List<Status>();
                LStatuses = await _quizDbContext.Statuses.ToListAsync();
                return LStatuses;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Statusesrepository", "GetAllStatuses");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return null;
            }
        }

        public async Task<Status?> GetStatusById(int? StatusId)
        {
            try
            {
                if (StatusId == 0)
                {
                    return null;
                }
                Status? Status = await _quizDbContext.Statuses.FindAsync(StatusId);
                if (Status == null)
                {
                    return null;
                }
                return Status;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Statusesrepository", "GetStatusById");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }

        }

        public async Task<bool> UpdateStatus(Status Status)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Status == null)
                {
                    return false;
                }
                _quizDbContext.Statuses.Update(Status);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Statusesrepository", "UpdateStatus");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }

        }



    }
}
