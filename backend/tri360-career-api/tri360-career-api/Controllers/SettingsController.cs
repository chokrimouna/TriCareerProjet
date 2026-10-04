using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quizback.Dto.Settings;
using Quizback.Services;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ISmtpSettingsService _smtpSettingsService;

        public SettingsController(ISmtpSettingsService smtpSettingsService)
        {
            _smtpSettingsService = smtpSettingsService;
        }

        [HttpGet("smtp")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSmtp()
        {
            var settings = await _smtpSettingsService.GetEffectiveSettingsAsync();
            return Ok(settings);
        }

        // "Synchroniser" : enregistre la configuration et l'applique immédiatement
        // (les prochains emails envoyés par l'application utilisent cette config, sans redémarrage).
        [HttpPut("smtp")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SaveSmtp([FromBody] SmtpSettingsDto dto)
        {
            try
            {
                await _smtpSettingsService.SaveAsync(dto);
                var settings = await _smtpSettingsService.GetEffectiveSettingsAsync();
                return Ok(settings);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // "Tester" : envoie un vrai email avec les valeurs actuellement saisies (pas forcément enregistrées).
        [HttpPost("smtp/test")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> TestSmtp([FromBody] SmtpTestRequestDto dto)
        {
            var result = await _smtpSettingsService.TestAsync(dto, dto.ToEmail);
            return Ok(result);
        }
    }
}
