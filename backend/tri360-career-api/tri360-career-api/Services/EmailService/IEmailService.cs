using Quizback.Helpter;

namespace Quizback.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(Mailrequest mailrequest);

        Task SendCredentialsEmail(string toEmail, string toName, string password, string role);
        Task SendRejectionEmail(string toEmail, string toName, string positionName);
        Task SendTestInvitation(string toEmail, string toName, string testName, string loginUrl);
        Task SendInterviewInvitation(string toEmail, string toName, string positionName, DateTime date, string location);
    }
}
