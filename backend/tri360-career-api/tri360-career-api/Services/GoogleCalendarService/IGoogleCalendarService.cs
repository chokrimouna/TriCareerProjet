using Google.Apis.Calendar.v3.Data;

namespace Quizback.Services
{
    public interface IGoogleCalendarService
    {
        Task<string> CreateMeetLink(string summary, DateTime start, DateTime end, List<string> attendees, string? plannerEmail = null);
    }
}
