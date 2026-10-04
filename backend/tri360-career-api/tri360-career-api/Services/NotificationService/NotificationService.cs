
namespace Quizback.Services
{
    public class NotificationService : INotificationService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public NotificationService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task CreateNotificationAsync(Notification notification)
        {
            using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if(notification == null){
                    throw new Exception("Notification is Null");
                }

                notification.IsRead = false;

                _dbContext.Notifications.Add(notification);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                throw new Exception("Notification error "+ ex);
            }
        }

        public async Task<List<Notification>?> GetunreadNotificationperuser(int userid)
        {
           using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                List<Notification>? unreadnotif = await _dbContext.Notifications
                                                .Where(n => n.UserId == userid && n.IsRead == false)
                                                .ToListAsync();
                
                if(unreadnotif == null)
                {
                    throw new Exception("You Have No Notification");
                }

                return unreadnotif;
                
            }
            catch (Exception ex)
            {
                throw new Exception("Notification error "+ ex);
            }
        }

        public async Task<List<Notification>> GetAllNotificationperuser(int userid)
        {
            return await _dbContext.Notifications
                .Where(n => n.UserId == userid)
                .OrderByDescending(n => n.Timestamp)
                .Take(50)
                .ToListAsync();
        }

        // Vue d'ensemble : toutes les notifications. "roleFilter" restreint aux notifications
        // des utilisateurs d'un rôle donné (Admin voit tout, RH/TeamLeader ne voient que leur rôle
        // — la restriction est appliquée côté serveur dans le contrôleur, pas ici).
        public async Task<List<Notification>> GetAllNotificationsAdmin(string? search, string? roleFilter)
        {
            var query = _dbContext.Notifications
                .Include(n => n.User)
                .ThenInclude(u => u!.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(roleFilter))
            {
                var r = roleFilter.Trim().ToLower();
                query = query.Where(n => n.User != null && n.User.Role != null && n.User.Role.Description != null
                    && n.User.Role.Description.ToLower() == r);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(n =>
                    (n.Message != null && n.Message.ToLower().Contains(s)) ||
                    (n.User != null && n.User.Name != null && n.User.Name.ToLower().Contains(s)) ||
                    (n.User != null && n.User.Prename != null && n.User.Prename.ToLower().Contains(s)) ||
                    (n.User != null && n.User.Email != null && n.User.Email.ToLower().Contains(s)));
            }

            return await query
                .OrderByDescending(n => n.Timestamp)
                .Take(200)
                .ToListAsync();
        }

        public async Task MarkAllAsReadAsync(int userid)
        {
            var notifs = await _dbContext.Notifications
                .Where(n => n.UserId == userid && n.IsRead == false)
                .ToListAsync();
            foreach (var n in notifs) n.IsRead = true;
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteNotificationAsync(int notificationId)
        {
            var notif = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.NotificationId == notificationId);
            if (notif == null) return;
            _dbContext.Notifications.Remove(notif);
            await _dbContext.SaveChangesAsync();
        }

        public async Task MarkNotificationAsReadAsync(int NotifId)
        {
            using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                Notification? notif = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.NotificationId == NotifId);
                
                if(notif == null)
                {
                    throw new Exception("notification is not founded");
                }
                notif.IsRead = true ;
                _dbContext.Notifications.Update(notif);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                
            }
            catch (Exception ex)
            {
                throw new Exception("Notification error "+ ex);
            }
        }
    }
}
