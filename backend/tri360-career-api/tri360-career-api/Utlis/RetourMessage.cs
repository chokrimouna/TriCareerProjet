namespace QuizBack.utils


{
    public class RetourMessage
    {
        public string? Message { get; set; }
        public bool? Statut { get; set; }

        public ExceptionDb? ExceptionDb { get; set; }

        public RetourMessage()
        {

        }
        public RetourMessage(string Message, bool statut, ExceptionDb exceptionDb)
        {
            this.Message = Message;
            this.Statut = statut;
            this.ExceptionDb = exceptionDb;
        }

    }
}