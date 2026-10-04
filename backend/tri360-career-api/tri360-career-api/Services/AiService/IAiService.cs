namespace Quizback.Services
{
    public interface IAiService
    {
        Task<List<AiResult>?> GetAllAi();
    }
}
