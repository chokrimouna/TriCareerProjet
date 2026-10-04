using Microsoft.Extensions.Options;

namespace QuizBack.utils


{
    public static class Crytage
    {
        private const string SECRET_KEY = "Triweb-triCareer";
        public static string Crypt(this string text)
        {
            return Convert.ToBase64String(

                    Encoding.Unicode.GetBytes(text + SECRET_KEY));
        }
        public static string Decrypt(this string text)
        {
            return Encoding.Unicode.GetString(
                         Convert.FromBase64String(text));
        }
    }
}