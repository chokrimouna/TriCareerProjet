namespace Quizback.Services


{
    public interface IOffreService
    {
        Task<(List<Offre>?, RetourMessage?)> GetAllOffres();
        Task<(Offre?, RetourMessage?)> GetOffreById(int offreId);
        Task<RetourMessage?> AddOffre(Offre offre);
        Task<RetourMessage?> UpdateOffre(Offre offre);
        Task<RetourMessage?> DeleteOffre(int offreId);
    }
}


