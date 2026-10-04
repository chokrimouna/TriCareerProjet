 

namespace Quizback.Services
{
    public interface IPiplineService
    {
        Task <bool> AddPipline(Pipline Pipline);
        Task <bool> DeletePipline(int Id);
        Task <bool> UpdatePipline(Pipline Pipline);
        Task<Pipline?> GetPiplineByID(int Id);
        Task<List<Pipline>?> GetPiplines();
    }
}
