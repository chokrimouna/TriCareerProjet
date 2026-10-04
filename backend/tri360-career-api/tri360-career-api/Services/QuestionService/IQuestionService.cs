namespace Quizback.Services
{
    public interface IQuestionService
    {
        Task<List<Question>?> GetAllQuestions();
        Task<Question?> GetQuestionById(int questionId);
        Task<List<Question>?> GetQuestionByIdSection(int idSection);
        Task AddQuestion(Question question);
        Task<Question?> EditQuestionwithAnswers(QuestionsAnswersEdit questionsAnswers);
        Task UpdateQuestion(Question question);
        Task QuestionDisactivated(int questionId);
        Task QuestionActivated(int questionId);
        Task DeleteQuestion(int questionId);
        Task<Question?> AddQuestionWithAnswers(QuestionsAnswers questionsAnswers);
    }
}
