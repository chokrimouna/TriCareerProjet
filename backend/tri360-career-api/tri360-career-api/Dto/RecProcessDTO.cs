namespace QuizBack.Dto
{
    public class RecProcessDTO
    {
        public int RecruitementProcessId { get; set; }

        public DateTime? DatePlanification { get; set; }

    }


    public class recruitementProcessWithIdExamen
    {

        public RecruitementProcess recruitementProcess { get; set; } = null!;

        public int? IdExamen { get; set; }

    }


    public class UpdateStatusDto 
    {
        public int  RecId { get; set; }
        public int  Status { get; set; }
        public bool Final { get; set; }
 
    }

}

