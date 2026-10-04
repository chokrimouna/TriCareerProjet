using QuizBack.Dto;

namespace Quizback.Services
{
    public interface IJWtService
    {
        string GenerateToken(string sessionId);
        bool ValidateToken(string token);
        string DecryptToken(string token);
    }
}
