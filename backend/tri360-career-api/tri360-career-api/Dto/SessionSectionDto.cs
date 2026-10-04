using Quizback.Models;
using System.Collections.Generic;

namespace QuizBack.Dto
{
    public class SessionSectionDto
    {
        public int SessionId { get; set; }
        public List<SectionDto> lSection { get; set; } = new List<SectionDto>();
        public int TotalDuration { get; set; } // in seconds
        public string? ExamTitle { get; set; }
        public string? Description { get; set; }
    }

    public class SectionDto
    {
        public int IdSection { get; set; }
        public string? NameSection { get; set; }
        public List<QuestionDto> questions { get; set; } = new List<QuestionDto>();
    }

    public class QuestionDto
    {
        public int IdQuestion { get; set; }
        public string? NameQuestion { get; set; }
        public string? Barem { get; set; }
        public List<AnswerDto> answers { get; set; } = new List<AnswerDto>();
    }

    public class AnswerDto
    {
        public int Id { get; set; }
        public string? Label { get; set; }
    }

    public class SessionDetailDto
    {
        public Session Session { get; set; } = null!;
        public int TotalBarem { get; set; }
        public int Totalduree { get; set; }
        public int timeReponse { get; set; }
        public decimal score { get; set; }
    }
}