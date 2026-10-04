using System.Collections.Generic;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public interface IStatusService
    {
        Task<List<Status>?> GetAllStatuss();
        Task<Status?> GetStatusById(int? StatusId);
        Task<bool> AddStatus(Status Status);
        Task<bool> UpdateStatus(Status Status);
        Task<bool> DeleteStatus(int? StatusId);

    }
}