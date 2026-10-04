namespace Quizback.Dto.Settings
{
    public class SmtpSettingsDto
    {
        public string Host { get; set; } = null!;
        public int Port { get; set; }
        public bool EnableSsl { get; set; }
        public string Username { get; set; } = null!;
        // Vide = ne pas changer le mot de passe déjà enregistré.
        public string? Password { get; set; }
        public string FromName { get; set; } = "TriCareer";
    }

    public class SmtpSettingsResponseDto
    {
        public string Host { get; set; } = null!;
        public int Port { get; set; }
        public bool EnableSsl { get; set; }
        public string Username { get; set; } = null!;
        public string FromName { get; set; } = "TriCareer";
        // Le mot de passe réel n'est jamais renvoyé au frontend.
        public bool HasPassword { get; set; }
        public bool IsCustomConfigured { get; set; }
    }

    public class SmtpTestRequestDto : SmtpSettingsDto
    {
        public string ToEmail { get; set; } = null!;
    }

    public class SmtpTestResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = null!;
    }
}
