
namespace QuizBack.Hubs
{
    public class NotificationHub : Hub
    {
        private readonly INotificationService _notificationService;
        private readonly IApplicationService _applicationService;
        public NotificationHub(INotificationService notificationService, IApplicationService applicationService)
        {
            _notificationService = notificationService;
            _applicationService = applicationService;
        }
        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();

            var userId = 3; 
            
            List<Notification>? unreadCount = await _notificationService.GetunreadNotificationperuser(userId);
            var NbUnreadNotif = unreadCount!.Count;

            await Clients.Caller.SendAsync("ReceiveCondidatePosting", NbUnreadNotif);
        }

        public async Task SendondidatePostingNotification(Application application)
        {

                await _applicationService.AddApplication(application);
                var userId = 3;

                await _notificationService.CreateNotificationAsync(new Notification
                {
                    Message = "New Suggestion",
                    Timestamp = DateTime.UtcNow,
                    IsRead = false,
                    UserId = userId
                });

                List<Notification>? unreadCount = await _notificationService.GetunreadNotificationperuser(userId);
                var NbUnreadNotif = unreadCount!.Count;
                await Clients.All.SendAsync("ReceiveCondidatePosting", NbUnreadNotif);

            }
    }
}