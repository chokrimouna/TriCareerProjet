using Quizback.Dto.Settings;

namespace Quizback.Services
{
    public class SmtpCredentials
    {
        public string Host { get; set; } = null!;
        public int Port { get; set; }
        public bool EnableSsl { get; set; }
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FromName { get; set; } = "TriCareer";
    }

    public interface ISmtpSettingsService
    {
        Task<SmtpCredentials> GetActiveCredentialsAsync();
        Task<SmtpSettingsResponseDto> GetEffectiveSettingsAsync();
        Task SaveAsync(SmtpSettingsDto dto);
        Task<SmtpTestResultDto> TestAsync(SmtpSettingsDto dto, string toEmail);
    }
}
