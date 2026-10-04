namespace Quizback.Dto
{
    public class QuestionsAnswers
    {

        public InQuestions? Question { get; set; }
        public List<InAnswer>? Answers { get; set; }



    }
public class QuestionsAnswersEdit
    {

        public InQuestionsEdit? Question { get; set; }
        public List<InAnswerEdit>? Answers { get; set; }



    }
    public class InQuestions
    {
        public string? NameQuestion { get; set; }

        public string? Durée { get; set; }

        public string? Score { get; set; }

        public int? IdSection { get; set; }

        public int? IdLevel { get; set; }

        public bool? Active { get; set; }

    }
     public class InQuestionsEdit
    {
        public int? idQuestion { get; set; }
        public string? NameQuestion { get; set; }

        public string? Durée { get; set; }

        public string? Score { get; set; }

        public int? IdSection { get; set; }

        public int? IdLevel { get; set; }

        public bool? Active { get; set; }

    }
     public class InAnswerEdit
    {
        public int? Id { get; set; }
        public string? Label { get; set; }

        public string? Type { get; set; }

        public string? Name { get; set; }

        public int? IsCorrect { get; set; }
        public string? Key { get; set; }
        


    }
    public class InAnswer
    {
        public string? Label { get; set; }

        public string? Type { get; set; }

        public string? Name { get; set; }

        public int? IsCorrect { get; set; }
    }
}