namespace Quizback.Dto
{
    public class RefreshToken
    {
        public required string Token { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime DateEpiration { get; set; }

        // public RefreshToken(string token, DateTime creation, DateTime expiiration)
        // {
        //     Token = token;
        //     DateCreation = creation;
        //     DateEpiration = expiiration;
        // }

    }
}