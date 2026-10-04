using Microsoft.AspNetCore.Authorization;
using Quizback.Models;
using Quizback.Services;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        // Toutes les notifications d'un utilisateur (lues + non lues)
        [HttpGet("user/{userId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(int userId)
        {
            try
            {
                var list = await _notificationService.GetAllNotificationperuser(userId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Notifications non lues d'un utilisateur
        [HttpGet("unread/{userId:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUnread(int userId)
        {
            try
            {
                var list = await _notificationService.GetunreadNotificationperuser(userId);
                return Ok(list ?? new List<Notification>());
            }
            catch (Exception)
            {
                return Ok(new List<Notification>());
            }
        }

        // Marquer une notification comme lue
        [HttpPut("{id:int}/read")]
        [AllowAnonymous]
        public async Task<IActionResult> MarkRead(int id)
        {
            try
            {
                await _notificationService.MarkNotificationAsReadAsync(id);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Supprimer une notification (bouton "Supprimer" de la cloche / de la gestion des notifications)
        [HttpDelete("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _notificationService.DeleteNotificationAsync(id);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Marquer toutes les notifications d'un utilisateur comme lues
        [HttpPut("user/{userId:int}/read-all")]
        [AllowAnonymous]
        public async Task<IActionResult> MarkAllRead(int userId)
        {
            try
            {
                await _notificationService.MarkAllAsReadAsync(userId);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Vue d'ensemble des notifications. Admin voit tous les rôles ; RH et TeamLeader
        // ne voient que les notifications des utilisateurs de leur propre rôle (imposé
        // côté serveur via le claim JWT, pas via le paramètre "role" envoyé par le client).
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin,RH,TeamLeader")]
        public async Task<IActionResult> GetAllAdmin([FromQuery] string? search)
        {
            try
            {
                var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
                var roleFilter = string.Equals(callerRole, "Admin", StringComparison.OrdinalIgnoreCase)
                    ? null
                    : callerRole;

                var list = await _notificationService.GetAllNotificationsAdmin(search, roleFilter);
                var result = list.Select(n => new
                {
                    notificationId = n.NotificationId,
                    message = n.Message,
                    timestamp = n.Timestamp,
                    isRead = n.IsRead,
                    userId = n.UserId,
                    userName = n.User != null ? $"{n.User.Prename} {n.User.Name}".Trim() : null,
                    userEmail = n.User != null ? n.User.Email : null,
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Créer une notification (utilisé par les événements + tests)
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] Notification notification)
        {
            try
            {
                if (notification == null || notification.UserId == null)
                    return BadRequest(new { error = "UserId requis." });
                notification.Timestamp ??= DateTime.Now;
                await _notificationService.CreateNotificationAsync(notification);
                return Ok(new { ok = true, notificationId = notification.NotificationId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
