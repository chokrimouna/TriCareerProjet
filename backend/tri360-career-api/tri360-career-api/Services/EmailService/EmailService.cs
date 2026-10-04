using System.Net;
using System.Net.Mail;
using System.Text;
using Quizback.Helpter;

namespace Quizback.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ISmtpSettingsService _smtpSettingsService;

        public EmailService(IConfiguration configuration, ISmtpSettingsService smtpSettingsService)
        {
            _configuration = configuration;
            _smtpSettingsService = smtpSettingsService;
        }

        public async Task SendCredentialsEmail(string toEmail, string toName, string password, string role)
        {
            var subject = "Bienvenue chez TriCareer - Vos identifiants";
            var body = BuildCredentialsBody(toName, toEmail, password, role);
            await SendHtmlEmailAsync(toEmail, subject, body);
        }

        public async Task SendRejectionEmail(string toEmail, string toName, string positionName)
        {
            var subject = "Suite à votre candidature - TriCareer";
            var safeName = string.IsNullOrWhiteSpace(toName) ? "Candidat" : WebUtility.HtmlEncode(toName);
            var safePosition = string.IsNullOrWhiteSpace(positionName) ? "le poste" : WebUtility.HtmlEncode(positionName);
            var body = $@"
                <div style='font-family: ""Segoe UI"", Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #1f2937;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;'>
                        <div style='background: linear-gradient(135deg, #6b7280 0%, #374151 100%); padding: 32px; text-align: center;'>
                            <h1 style='color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;'>TriCareer — Réponse à votre candidature</h1>
                        </div>
                        <div style='padding: 40px;'>
                            <h2 style='color: #111827; margin-top: 0; font-size: 20px;'>Bonjour {safeName},</h2>
                            <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>Nous vous remercions de l'intérêt que vous portez à TriCareer et du temps consacré à votre candidature pour <strong>{safePosition}</strong>.</p>
                            <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>Après une analyse attentive de votre profil, nous sommes au regret de vous informer que votre candidature n'a pas été retenue pour cette opportunité.</p>
                            <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>Ce choix ne remet nullement en cause vos qualités. Nous conservons votre profil et n'hésiterons pas à vous recontacter si une opportunité correspondant davantage à votre parcours se présente.</p>
                            <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>Nous vous souhaitons une pleine réussite dans vos projets professionnels.</p>
                            <p style='color: #6b7280; font-size: 14px; margin-top: 24px;'>Cordialement,<br/>L'équipe de recrutement TriCareer</p>
                        </div>
                        <div style='background-color: #f3f4f6; padding: 24px; text-align: center;'>
                            <p style='color: #6b7280; font-size: 13px; margin: 0;'>© 2026 TriCareer — Plateforme de recrutement</p>
                        </div>
                    </div>
                </div>";
            await SendHtmlEmailAsync(toEmail, subject, body);
        }

        public async Task SendTestInvitation(string toEmail, string toName, string testName, string loginUrl)
        {
            var subject = $"Invitation au test : {testName} - TriCareer";
            var body = $@"
                <div style='font-family: sans-serif; background-color: #f9fafb; padding: 40px 20px;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden;'>
                        <div style='background-color: #DC2626; padding: 32px; text-align: center;'>
                            <h1 style='color: white; margin: 0; font-size: 22px;'>Nouveau Test Assigné</h1>
                        </div>
                        <div style='padding: 40px;'>
                            <h2 style='color: #111827;'>Bonjour {WebUtility.HtmlEncode(toName)},</h2>
                            <p style='color: #4b5563; font-size: 16px;'>Vous avez été invité à passer le test technique : <strong>{WebUtility.HtmlEncode(testName)}</strong>.</p>
                            <div style='text-align: center; margin-top: 32px;'>
                                <a href='{loginUrl}' style='background-color: #DC2626; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;'>Commencer le test</a>
                            </div>
                            <p style='color: #6b7280; font-size: 13px; text-align: center; margin-top: 32px;'>© 2026 TriCareer — Plateforme de recrutement</p>
                        </div>
                    </div>
                </div>";
            await SendHtmlEmailAsync(toEmail, subject, body);
        }

        public async Task SendInterviewInvitation(string toEmail, string toName, string positionName, DateTime date, string location)
        {
            var subject = $"Invitation à un entretien : {positionName} - TriCareer";
            var body = $@"
                <div style='font-family: sans-serif; background-color: #f9fafb; padding: 40px 20px;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden;'>
                        <div style='background-color: #DC2626; padding: 32px; text-align: center;'>
                            <h1 style='color: white; margin: 0; font-size: 22px;'>Invitation Entretien</h1>
                        </div>
                        <div style='padding: 40px;'>
                            <h2 style='color: #111827;'>Bonjour {WebUtility.HtmlEncode(toName)},</h2>
                            <p style='color: #4b5563;'>Nous avons le plaisir de vous convier à un entretien pour le poste de <strong>{WebUtility.HtmlEncode(positionName)}</strong>.</p>
                            
                            <div style='background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0;'>
                                <p style='margin: 5px 0;'>📅 <strong>Date :</strong> {date:dd/MM/yyyy à HH:mm}</p>
                                <p style='margin: 5px 0;'>📍 <strong>Lien de réunion :</strong></p>
                                { (location.StartsWith("http") ? $@"
                                <div style='margin-top: 12px;'>
                                    <a href='{location}' style='background-color: #DC2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Rejoindre l'entretien</a>
                                    <p style='color: #6b7280; font-size: 13px; margin-top: 12px;'>
                                        Cliquez sur le bouton pour rejoindre directement. Votre accès sera confirmé par l'interviewer.
                                    </p>
                                </div>" : $@"<p style='color: #DC2626; font-weight: bold;'>{(string.IsNullOrWhiteSpace(location) ? "Lien de visio disponible sur votre tableau de bord" : WebUtility.HtmlEncode(location))}</p>") }
                            </div>

                            <p style='color: #6b7280; font-size: 14px;'>Nous avons hâte de vous rencontrer.</p>
                            <p style='color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;'>© 2026 TriCareer</p>
                        </div>
                    </div>
                </div>";
            await SendHtmlEmailAsync(toEmail, subject, body);
        }

        public async Task SendEmailAsync(Mailrequest mailrequest)
        {
            await SendHtmlEmailAsync(mailrequest.ToEmail!, mailrequest.Subject!, mailrequest.Body!);
        }

        private async Task SendHtmlEmailAsync(string toEmail, string subject, string body)
        {
            var creds = await _smtpSettingsService.GetActiveCredentialsAsync();

            if (string.IsNullOrWhiteSpace(creds.Host) ||
                string.IsNullOrWhiteSpace(creds.Username) ||
                string.IsNullOrWhiteSpace(creds.Password))
            {
                throw new InvalidOperationException("Email SMTP configuration is missing required values.");
            }

            using var message = new MailMessage();
            message.From = new MailAddress(creds.Username, creds.FromName);
            message.To.Add(toEmail);
            message.Subject = subject;
            message.Body = body;
            message.IsBodyHtml = true;

            using var smtp = new SmtpClient(creds.Host, creds.Port);
            smtp.EnableSsl = creds.EnableSsl;
            smtp.Credentials = new NetworkCredential(creds.Username, creds.Password);
            await smtp.SendMailAsync(message);
        }

        private static string BuildCredentialsBody(string toName, string toEmail, string password, string role)
        {
            var safeName = string.IsNullOrWhiteSpace(toName) ? "Utilisateur" : WebUtility.HtmlEncode(toName);
            var safeRole = string.IsNullOrWhiteSpace(role) ? "Candidat" : WebUtility.HtmlEncode(role);

            return $@"
                <div style='font-family: ""Segoe UI"", Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #1f2937;'>
                    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;'>
                        <!-- Header -->
                        <div style='background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); padding: 32px; text-align: center;'>
                            <div style='background-color: rgba(255,255,255,0.2); width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;'>
                                <span style='color: white; font-weight: bold; font-size: 20px;'>TC</span>
                            </div>
                            <h1 style='color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;'>Bienvenue chez TriCareer</h1>
                        </div>
                        
                        <!-- Content -->
                        <div style='padding: 40px;'>
                            <h2 style='color: #111827; margin-top: 0; font-size: 20px;'>Bonjour {safeName},</h2>
                            <p style='color: #4b5563; font-size: 16px; line-height: 1.6;'>Félicitations ! Votre candidature a été reçue avec succès et votre compte candidat a été créé sur notre plateforme de recrutement. Vous pouvez désormais accéder à votre espace personnel pour suivre vos tests et entretiens.</p>
                            
                            <div style='background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 24px; margin: 32px 0;'>
                                <h3 style='margin-top: 0; color: #991B1B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;'>Vos identifiants d'accès</h3>
                                <table style='width: 100%; font-size: 15px;'>
                                    <tr>
                                        <td style='color: #7f1d1d; padding: 8px 0;'><strong>Email :</strong></td>
                                        <td style='color: #111827; padding: 8px 0;'>{WebUtility.HtmlEncode(toEmail)}</td>
                                    </tr>
                                    <tr>
                                        <td style='color: #7f1d1d; padding: 8px 0;'><strong>Mot de passe :</strong></td>
                                        <td style='color: #111827; padding: 8px 0;'><code>{WebUtility.HtmlEncode(password)}</code></td>
                                    </tr>
                                    <tr>
                                        <td style='color: #7f1d1d; padding: 8px 0;'><strong>Rôle :</strong></td>
                                        <td style='color: #111827; padding: 8px 0;'>{safeRole}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style='text-align: center; margin-top: 32px;'>
                                <a href='http://localhost:5174/login' style='background-color: #DC2626; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px; transition: all 0.2s;'>Accéder à mon espace</a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style='background-color: #f3f4f6; padding: 24px; text-align: center;'>
                            <p style='color: #6b7280; font-size: 13px; margin: 0;'>© 2026 TriCareer — Plateforme de recrutement propulsée par TriCareer</p>
                        </div>
                    </div>
                </div>";
        }
    }
}
