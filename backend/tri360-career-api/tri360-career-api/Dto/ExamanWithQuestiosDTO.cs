namespace Quizback.Dto
{

    public class ExamanWithQuestionsDto
    {
        public int? UserId { get; set; }

        public string? Description { get; set; }

        public string? Titre { get; set; }

        public bool? Active { get; set; }

        public DateTime? DateCreation { get; set; }

        public int? Duration { get; set; }

        public List<int>? QuestionListId { get; set; }

        
    }




}