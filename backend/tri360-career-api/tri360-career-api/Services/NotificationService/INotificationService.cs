namespace Quizback.Services
{
    public interface INotificationService
    {
        Task<List<Notification>?> GetunreadNotificationperuser(int userid);
        Task<List<Notification>> GetAllNotificationperuser(int userid);
        Task<List<Notification>> GetAllNotificationsAdmin(string? search, string? roleFilter);
        Task CreateNotificationAsync(Notification notification);
        Task MarkNotificationAsReadAsync(int NotifId);
        Task MarkAllAsReadAsync(int userid);
        Task DeleteNotificationAsync(int notificationId);
    }
}
