namespace Quizback.Services
{
    public interface ITimelineService
    {
        Task<(List<Timeline>?, RetourMessage?)> GetTimelines();
        Task<(Timeline?, RetourMessage?)> GetTimelineByID(int Id);
        Task<RetourMessage?> AddTimeline(Timeline timeline);
        Task<RetourMessage?> DeleteTimeline(int Id);
        Task<(Timeline?, RetourMessage?)> UpdatetTimeline(Timeline timeline);
    }
}
