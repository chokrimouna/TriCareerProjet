namespace QuizBack.utils
{
    public static class PasswordGenerator
    {
        public static string Generate(string name, string prename)
        {
            var clean = CleanFirstName(name);
            var initial = string.IsNullOrWhiteSpace(prename) ? "X" : prename.Trim()[0].ToString().ToUpper();
            var digits = Random.Shared.Next(1000, 10000).ToString();
            return $"{clean}.{initial}{digits}";
        }

        public static string GenerateForCandidate(string name, string prename, string email)
        {
            var clean = CleanFirstName(name);
            var year = DateTime.Now.Year.ToString().Substring(2);
            var digits = Random.Shared.Next(1000, 10000).ToString();
            return $"{clean}.{year}{digits}";
        }

        private static string CleanFirstName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return "User";
            }

            return name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];
        }
    }
}
