namespace Quizback.Services


{
    public class ReponseDetailService : IResponseDetailService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connectionString;

        public ReponseDetailService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<ReponseDetail>?> GetReponseDetails()
        {
            try
            {
                List<ReponseDetail>? ReponseDetails = await _quizDbContext.ReponseDetails.ToListAsync();

                if (ReponseDetails.Count == 0)
                    return ReponseDetails;
                else
                    return ReponseDetails;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ReponseDetailService", "GetReponseDetails");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        public async Task<ReponseDetail?> GetReponseDetailByID(int Id)
        {

            try
            {
                ReponseDetail? ReponseDetail = await _quizDbContext.ReponseDetails.FindAsync(Id);

                if (ReponseDetail == null)
                    return null;
                else
                    return ReponseDetail;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ReponseDetailService", "GetReponseDetailByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }


        public async Task<ReponseDetail?> AddReponseDetail(ReponseDetail ReponseDetail)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (ReponseDetail == null) return (null);

                await _quizDbContext.ReponseDetails.AddAsync(ReponseDetail);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return ReponseDetail;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ReponseDetailService", "AddReponseDetail");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        public async Task<RetourMessage?> DeleteReponseDetail(int Id)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                ReponseDetail? ReponseDetail = await _quizDbContext.ReponseDetails.FindAsync(Id);
                if (ReponseDetail == null)
                    return new RetourMessage("La valeur de réponse n'existe pas", false, null!);

                _quizDbContext.ReponseDetails.Remove(ReponseDetail);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RetourMessage("Valeur de réponse supprimée avec succès", true, null!);
            }

            catch (Exception e)

            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ReponseDetailService", "DeleteReponseDetail");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage("Erreur lors de la suppression de la valeur de réponse", false, exceptionDb);
            }
        }

        public async Task<ReponseDetail?> UpdateReponseDetail(ReponseDetail ReponseDetail)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (ReponseDetail == null)
                    return null!;
                _quizDbContext.ReponseDetails.Update(ReponseDetail);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return ReponseDetail;
            }

            catch (Exception e)

            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ReponseDetailService", "UpdateReponseDetail");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null!;
            }
        }

        public Task<List<ReponseDetail>?> GetReponseDetail()
        {
            throw new NotImplementedException();
        }

    }

}
















