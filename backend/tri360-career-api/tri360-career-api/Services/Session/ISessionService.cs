using QuizBack.Dto;

namespace Quizback.Services
{
    public interface ISessionService
    {
        Task<List<Session>?> GetAllSessions(int? departmentId = null, int? userId = null);
        Task<Session?> GetSessionById(string encrptsessionId);
        Task<Session?> GetSessionByIdApp(int AppId);
        Task<string> AddSession(SessionDto session);
        Task<bool?> PutSession(Session session);
        Task<SessionSectionDto> GetResponseDetailWithScoreByIdSession(string IdSession);
        Task<List<SessionDetailDto>> GetSessionAllByIdApp(int applicationId);

        Task<string> AddNewSessionForSameRecProcess(Session session);
        Task<object> GetSimpleSessionsByAppId(int appId);
        Task<bool> DeleteSession(int sessionId);
        Task<bool> UpdateScore(int sessionId, int score, string? reviewComment);
        Task<object?> GetSessionResult(int sessionId);
        Task RefreshApplicationScore(int applicationId);
        Task<double?> CalculateSessionScoreInternal(int sessionId);
    }
}
