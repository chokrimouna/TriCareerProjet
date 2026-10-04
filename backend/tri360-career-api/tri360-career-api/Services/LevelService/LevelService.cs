namespace Quizback.Services
{
    public class LevelService : ILevelService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connection;

        public LevelService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connection = configuration.GetConnectionString("ConnectionString")!;
        }


        public async Task<bool> AddLevel(Level Level)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Level == null)
                {
                    return false;
                }
                await _quizDbContext.Levels.AddAsync(Level);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;

            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Levelsrepository", "AddLevel");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }
        }

        public async Task<bool> DeleteLevel(int? LevelId)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (LevelId == 0)
                {
                    return false;
                }
                Level? Level = await _quizDbContext.Levels.FindAsync(LevelId);
                if (Level == null)
                {
                    return false;
                }
                _quizDbContext.Levels.Remove(Level);

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Levelsrepository", "DeleteLevel");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e); // developement
                return false;
            }
        }

        public async Task<List<Level>?> GetAllLevels()
        {
            try
            {
                List<Level> LLevels = new List<Level>();
                LLevels = await _quizDbContext.Levels.ToListAsync();
                return LLevels;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Levelsrepository", "GetAllLevels");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return null;
            }
        }

        public async Task<Level?> GetLevelById(int? LevelId)
        {
            try
            {
                if (LevelId == 0)
                {
                    return null;
                }
                Level? Level = await _quizDbContext.Levels.FindAsync(LevelId);
                if (Level == null)
                {
                    return null;
                }
                return Level;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Levelsrepository", "GetLevelById");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }

        }

        public async Task<bool> UpdateLevel(Level Level)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Level == null)
                {
                    return false;
                }
                _quizDbContext.Levels.Update(Level);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Levelsrepository", "UpdateLevel");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }

        }



    }
}
