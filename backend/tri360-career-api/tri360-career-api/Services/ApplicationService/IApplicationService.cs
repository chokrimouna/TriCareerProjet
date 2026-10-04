
using QuizBack.Dto;

namespace Quizback.Services
{
    public interface IApplicationService
    {
        Task<List<AppliDto>?> GetAllApplications(int? departmentId = null, int page = 1, int pageSize = 10);
        Task<int> GetTotalApplicationsCount(int? departmentId = null);
        Task<List<Application>?> GetApplications(int state);
        Task<List<ApplicationByState>?> GetApplicationsProcess(int state);
        Task<List<Quizback.Models.State>> GetStates();
        Task<List<Application>?> GetApplicationsSansRecrutement();
        Task<Application?> GetApplicationSansRecrutementById(int applicationId);
        Task<Application?> GetApplicationByID(int Id);
        Task AddApplication(Application application);
        Task AddApplicationWithAiResult(AppWithAiResultDto application);
        Task DeleteApplication(int Id);
        Task<Application?> UpdatetApplication(Application application);
        Task<Application?> ActionsAcceptRefuse(Actions actions);
        
        Task<Application?> UpdateApplicationState(int applicationId, int newState);
        Task UpdateRecommendation(int applicationId, bool isRecommended);
        Task ApplyCandidate(CandidateApplyDto applyDto);
        Task RefreshApplicationScore(int applicationId);
        Task ReassignTeamLeader(int applicationId, int teamLeaderId);
    }
}
