namespace Quizback.Services
{
    public interface IHistService
    {
        Task<List<HistoriqueApplication>?> GetAllHists();
        Task <HistoriqueApplication?> GetlastHistByIdApp(int IdApp);
        Task<HistoriqueApplication?> GetHistById(int HistId);
        Task AddHist(HistoriqueApplication Hist);
        Task UpdateHist(HistoriqueApplication Hist);
        Task DeleteHist(int Hist);
    }
}
