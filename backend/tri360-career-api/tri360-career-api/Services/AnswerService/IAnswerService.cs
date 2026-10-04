namespace Quizback.Services
{
    public interface IAnswerService
    {
        Task<List<Answer>?> GetAllAnswers();
        Task<Answer?> GetAnswerById(int answerId);
        Task AddAnswer(Answer answer);
        Task UpdateAnswer(Answer answer);
        Task DeleteAnswer(int answerId);
        Task<List<Answer>?> GetAnswersByQuestionId(int questionId);
    }
}
