namespace Quizback.Services


{
    public class OffreService : IOffreService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public OffreService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<(List<Offre>?, RetourMessage?)> GetAllOffres()
        {

            try
            {
                List<Offre> offres = await _dbContext.Offres.ToListAsync();

                if (offres == null)
                    return (null, new RetourMessage("L offre n'existe pas", false, null!));
                else
                    return (offres, new RetourMessage("Succès", true, null!));
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "OffreService", "GetAllOffres");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return (null, new RetourMessage { Message = "Erreur lors de la récupération de tous les niveaux", ExceptionDb = exceptionDb });
            }
        }

        public async Task<(Offre?, RetourMessage?)> GetOffreById(int offreId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                Offre? offre = await _dbContext.Offres.FirstOrDefaultAsync(l => l.IdOffre == offreId);
                if (offre == null)
                    return (null, new RetourMessage("L offre n'existe pas", false, null!));
                else
                    return (offre, new RetourMessage("Succès", true, null!));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "OffreService", "GetOffreById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return (null, new RetourMessage { Message = "Erreur lors de la récupération du niveau par ID", ExceptionDb = exceptionDb });
            }
        }

        public async Task<RetourMessage?> AddOffre(Offre offre)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (offre == null) return new RetourMessage("Offre null", false, null!);
                _dbContext.Offres.Add(offre);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return new RetourMessage("Offre est ajouté avec succés", true, null!);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "OffreService", "AddOffre");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage { Message = "Erreur lors de l'ajout du niveau", ExceptionDb = exceptionDb };
            }
        }

        public async Task<RetourMessage?> UpdateOffre(Offre offre)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (offre == null) return new RetourMessage("Offre n'existe pas", false, null!);
                _dbContext.Offres.Update(offre);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return new RetourMessage("Offre mis à jour avec succès", true, null!);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "OffreService", "UpdateOffre");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage { Message = "Erreur lors de la mise à jour du niveau", ExceptionDb = exceptionDb };
            }
        }

        public async Task<RetourMessage?> DeleteOffre(int offreId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                Offre? offre = await _dbContext.Offres.FindAsync(offreId);
                if (offre == null) return new RetourMessage("Offre n'existe pas", false, null!);
                {
                    _dbContext.Offres.Remove(offre);
                    await _dbContext.SaveChangesAsync();
                }
                await transaction.CommitAsync();
                return new RetourMessage("Offres mis à jour avec succès", true, null!);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "OffreService", "DeleteOffre");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage { Message = "Erreur lors de la suppression du niveau", ExceptionDb = exceptionDb };
            }
        }
    }
}


