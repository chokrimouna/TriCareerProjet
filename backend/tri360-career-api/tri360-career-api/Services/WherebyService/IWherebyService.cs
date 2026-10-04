namespace Quizback.Services
{
    public interface IWherebyService
    {
        Task<WherebyMeetingResult?> CreateMeetingAsync(
            string summary,
            DateTime start,
            DateTime end
        );
    }

    public class WherebyMeetingResult
    {
        public string MeetingId { get; set; } = string.Empty;
        public string RoomUrl { get; set; } = string.Empty;
        public string HostRoomUrl { get; set; } = string.Empty;
        public DateTime EndDate { get; set; }
    }
}