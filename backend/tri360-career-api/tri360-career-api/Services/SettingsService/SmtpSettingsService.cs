using System.Net;
using System.Net.Mail;
using System.Text.Json;
using Quizback.Dto.Settings;

namespace Quizback.Services
{
    // Stocke la config SMTP dans un fichier JSON en dehors de "Resources" (qui est servi
    // publiquement en statique par l'API — voir Program.cs / UseStaticFiles) afin de ne
    // jamais exposer le mot de passe SMTP par une URL non protégée. Le dossier "Settings"
    // est monté sur un volume Docker dédié (voir docker-compose.yml) et survit donc aux
    // recréations de conteneur sans nécessiter de "docker compose down -v".
    public class SmtpSettingsService : ISmtpSettingsService
    {
        private readonly IConfiguration _configuration;
        private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

        public SmtpSettingsService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private static string SettingsFilePath =>
            Path.Combine(Directory.GetCurrentDirectory(), "Settings", "smtp.json");

        private async Task<SmtpCredentials?> ReadStoredCredentialsAsync()
        {
            var path = SettingsFilePath;
            if (!File.Exists(path)) return null;
            try
            {
                var json = await File.ReadAllTextAsync(path);
                return JsonSerializer.Deserialize<SmtpCredentials>(json);
            }
            catch
            {
                return null;
            }
        }

        private SmtpCredentials ReadFallbackCredentials()
        {
            var host = _configuration["Email:Host"] ?? _configuration["EmailSettings:Host"];
            var port = int.TryParse(_configuration["Email:Port"] ?? _configuration["EmailSettings:Port"], out var parsedPort)
                ? parsedPort
                : 587;
            var enableSsl = bool.TryParse(_configuration["Email:EnableSsl"], out var parsedEnableSsl) ? parsedEnableSsl : true;
            var username = _configuration["Email:Username"] ?? _configuration["EmailSettings:Email"];
            var password = _configuration["Email:Password"] ?? _configuration["EmailSettings:Password"];
            var fromName = _configuration["Email:FromName"] ?? _configuration["EmailSettings:Displayname"] ?? "TriCareer";

            return new SmtpCredentials
            {
                Host = host ?? "",
                Port = port,
                EnableSsl = enableSsl,
                Username = username ?? "",
                Password = password ?? "",
                FromName = fromName,
            };
        }

        public async Task<SmtpCredentials> GetActiveCredentialsAsync()
        {
            var stored = await ReadStoredCredentialsAsync();
            return stored ?? ReadFallbackCredentials();
        }

        public async Task<SmtpSettingsResponseDto> GetEffectiveSettingsAsync()
        {
            var stored = await ReadStoredCredentialsAsync();
            var effective = stored ?? ReadFallbackCredentials();

            return new SmtpSettingsResponseDto
            {
                Host = effective.Host,
                Port = effective.Port,
                EnableSsl = effective.EnableSsl,
                Username = effective.Username,
                FromName = effective.FromName,
                HasPassword = !string.IsNullOrWhiteSpace(effective.Password),
                IsCustomConfigured = stored != null,
            };
        }

        public async Task SaveAsync(SmtpSettingsDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Host)) throw new ArgumentException("Le serveur SMTP (host) est requis.");
            if (dto.Port <= 0) throw new ArgumentException("Le port SMTP est invalide.");
            if (string.IsNullOrWhiteSpace(dto.Username)) throw new ArgumentException("Le nom d'utilisateur (adresse email) est requis.");

            var current = await GetActiveCredentialsAsync();
            var password = string.IsNullOrWhiteSpace(dto.Password) ? current.Password : dto.Password;
            if (string.IsNullOrWhiteSpace(password)) throw new ArgumentException("Le mot de passe est requis.");

            var toSave = new SmtpCredentials
            {
                Host = dto.Host.Trim(),
                Port = dto.Port,
                EnableSsl = dto.EnableSsl,
                Username = dto.Username.Trim(),
                Password = password,
                FromName = string.IsNullOrWhiteSpace(dto.FromName) ? "TriCareer" : dto.FromName.Trim(),
            };

            var dir = Path.GetDirectoryName(SettingsFilePath)!;
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            await File.WriteAllTextAsync(SettingsFilePath, JsonSerializer.Serialize(toSave, JsonOptions));
        }

        public async Task<SmtpTestResultDto> TestAsync(SmtpSettingsDto dto, string toEmail)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                return new SmtpTestResultDto { Success = false, Message = "Adresse email de destination requise." };

            try
            {
                var current = await GetActiveCredentialsAsync();
                var password = string.IsNullOrWhiteSpace(dto.Password) ? current.Password : dto.Password;

                if (string.IsNullOrWhiteSpace(dto.Host) || string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(password))
                {
                    return new SmtpTestResultDto { Success = false, Message = "Host, nom d'utilisateur et mot de passe sont requis pour tester." };
                }

                using var message = new MailMessage();
                message.From = new MailAddress(dto.Username, string.IsNullOrWhiteSpace(dto.FromName) ? "TriCareer" : dto.FromName);
                message.To.Add(toEmail);
                message.Subject = "TriCareer - Test de configuration SMTP";
                message.Body = "<div style=\"font-family:Arial,sans-serif;padding:20px\">" +
                    "<h2>Configuration SMTP valide</h2>" +
                    "<p>Cet email confirme que la configuration SMTP saisie dans le panneau d'administration TriCareer fonctionne correctement.</p>" +
                    "</div>";
                message.IsBodyHtml = true;

                using var smtp = new SmtpClient(dto.Host, dto.Port > 0 ? dto.Port : 587);
                smtp.EnableSsl = dto.EnableSsl;
                smtp.Credentials = new NetworkCredential(dto.Username, password);
                await smtp.SendMailAsync(message);

                return new SmtpTestResultDto { Success = true, Message = $"Email de test envoyé avec succès à {toEmail}." };
            }
            catch (Exception ex)
            {
                return new SmtpTestResultDto { Success = false, Message = ex.Message };
            }
        }
    }
}
