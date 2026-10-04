
namespace Quizback.Services    {
    public class TimelineService : ITimelineService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connectionString;
        public TimelineService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }
        #region crud Timelines

        public async Task<RetourMessage?> AddTimeline(Timeline timeline)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {

                if (timeline == null) return new RetourMessage("  null", false, null!);
                await _quizDbContext.Timelines.AddAsync(timeline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return new RetourMessage("  est ajouté avec succès", true, null!);

            }

            catch (Exception e)

            {

                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "TimelineService", "AddTimeline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage("Erreur d'ajout  ", false, exceptionDb);

            }
        }
        public async Task<RetourMessage?> DeleteTimeline(int Id)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                Timeline? timeline = _quizDbContext.Timelines.Find(Id);
                if (timeline == null) return new RetourMessage("  n'existe pas", false, null!);
                _quizDbContext.Timelines.Remove(timeline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return new RetourMessage("  est supprimé avec succès", true, null!);
            }

            catch (Exception e)

            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "TimelineService", "DeleteTimeline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage("Erreur de suppression  ", false, exceptionDb);
            }
        }
        public async Task<(Timeline?, RetourMessage?)> UpdatetTimeline(Timeline Timeline)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Timeline == null) return (null, new RetourMessage("  n'existe pas", false, null!));
                _quizDbContext.Timelines.Update(Timeline);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (Timeline, new RetourMessage("  est mis à jour avec succès", true, null!));
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "TimelineService", "UpdatetTimeline");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return (null, new RetourMessage("Erreur de mise à jour  ", false, exceptionDb));
            }
        }

        public async Task<(Timeline?, RetourMessage?)> GetTimelineByID(int Id)
        {
            try
            {
                Timeline? timeline = await _quizDbContext.Timelines
                     .FirstOrDefaultAsync(u => u.TimelineId == Id);

                if (timeline == null)
                    return (null, new RetourMessage("L'  n'existe pas", false, null!));
                else
                    return (timeline, new RetourMessage("Succès", true, null!));
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "TimelineService", "GetTimelineByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return (null, new RetourMessage("Erreur get   by Id ", false, exceptionDb));
            }
        }

        public async Task<(List<Timeline>?, RetourMessage?)> GetTimelines()
        {
            try
            {
                List<Timeline>? LTimelinedb = await _quizDbContext.Timelines
                     .ToListAsync();
                if (LTimelinedb.Count == 0)
                    return (LTimelinedb, new RetourMessage("Liste des   n'existe pas", false, null!));
                else
                    return (LTimelinedb, new RetourMessage("Succès", true, null!));
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "TimelineService", "GetTimelines");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return (null, new RetourMessage("Erreur get  des  ", false, exceptionDb));
            }
        }

        #endregion
 
    }
}
