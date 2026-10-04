using System.Collections.Generic;
using System.Threading.Tasks;
using QuizBack.Dto;
using Quizback.Models;

namespace Quizback.Services
{
    public interface IRecruitementProcessService
    {
        Task<string> AddRecruitementProcess(recruitementProcessWithIdExamen recruitementProcessWithIdExamen);
        Task DeleteRecruitementProcess(int Id);
        Task UpdateRecruitementProcess(RecruitementProcess RecruitementProcess);
        Task EditDateRecProcess(RecProcessDTO RecruitementProcess);
        Task<RecruitementProcess?> GetRecruitementProcessByID(int Id);
        Task<RecruitementProcess?> GetLastRecruitementProcessStatusByIDApp(int Id);
        Task<List<RecruitementProcess>?> GetRecruitementProcessByAppId(int appId);
        Task<List<RecruitementProcess>?> GetRecruitementProcesss(int? departmentId = null, int? userId = null);
        Task<List<RecruitementProcess>?> GetDataDashboard();
        Task<RecruitementProcess?> GetRecruitementProcessByUserId(int userId, int status);
        Task<List<RecruitementProcess>?> GetRecruitementProcessByApplicationID(int idApplication);
        Task<RecruitementProcess?> UpdateRecruitementProcessstatut(UpdateStatusDto UpdateStatusDto);
        Task RefreshApplicationScore(int applicationId);
        Task<string> GenerateMeetLink(MeetRequestDto request);
    }
}