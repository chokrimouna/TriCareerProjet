namespace Quizback.Helpter
{
    public class Mailrequest
    {
        public string? ToEmail { get; set; }
        public string  Subject { get; set; } = null!;
        public string Body { get; set; } = null!;
    }
}