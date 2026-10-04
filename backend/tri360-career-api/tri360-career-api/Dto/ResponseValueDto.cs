namespace QuizBack.Dto

{

    // public class ResponseValueData
    // {
    //     public int? IdQuestion { get; set; }

    //     public int? ApplicationId { get; set; }

    //     public int? TimeReponse { get; set; }
    // }

    // public class ResponseDetailData
    // {
    //     public int IdAnswers { get; set; }

    //     public string? Value { get; set; }
    // }

    public class ResponseValueDto
    {
        public ReponseValue ResponseValuedata { get; set; } = null!;
        public List<ReponseDetail> ResponseDetaildata { get; set; } = null!;
    }
}