using System.Collections.Generic;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public interface IAiQuizService
    {
        Task<List<GeneratedQuestion>> GenerateQuiz(string topic, string difficulty, int questionCount, string language = "fr");
    }

    public class GeneratedQuestion
    {
        public string QuestionText { get; set; } = string.Empty;
        public string Explanation { get; set; } = string.Empty;
        public List<GeneratedAnswer> Answers { get; set; } = new List<GeneratedAnswer>();
    }

    public class GeneratedAnswer
    {
        public string Text { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }
}
