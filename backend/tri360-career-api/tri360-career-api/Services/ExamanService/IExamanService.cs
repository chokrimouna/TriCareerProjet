namespace Quizback.Services
{
    public interface IExamanService
    {
        Task<List<Examan>?> GetAllExamen(int? departmentId = null);
        Task<Examan?> GetExamanById(int examanId);
        Task<Examan?> AddExaman(Examan examan);
        Task UpdateExaman(Examan examan);

        Task ExamanDisactivated(int examanId);
        Task ExamanActivated(int examanId);
        Task DeleteExaman(int examanId);
    }
}
