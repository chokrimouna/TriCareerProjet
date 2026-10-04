using Quizback.Helpter;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Quizback.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerController : ControllerBase
    {
        private readonly TriCareerContext _context;
        private readonly IEmailService _emailService;

        public CustomerController(TriCareerContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("GetAll")]
        public ActionResult GetAll()
        {
            return Ok(_context.TblCustomers.ToList());
        }

        [HttpPost("SendMail")]
        public async Task<IActionResult> SendMail(Mailrequest mailRequest)
        {
            try
            {
                var mailRequestNew = new Mailrequest
                {
                    ToEmail = mailRequest.ToEmail,
                    Subject = "Confirmation de votre entretien d'embauche chez TriWeb",
                    Body = GetHtmlContent()
                };
                await _emailService.SendEmailAsync(mailRequestNew);
                return Ok();
            }
            catch (Exception ex)
            {
                // Considérez la journalisation de l'exception ici
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("SendCustomMail")]
        public async Task<IActionResult> SendCustomMail([FromBody] Mailrequest customMailRequest)
        {
            try
            {
                var mailRequest = new Mailrequest
                {
                    ToEmail = customMailRequest.ToEmail,
                    Subject = customMailRequest.Subject,
                    Body = customMailRequest.Body
                };

                await _emailService.SendEmailAsync(mailRequest);
                return Ok();
            }
            catch (Exception ex)
            {
                // Considérez la journalisation de l'exception ici
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private string GetHtmlContent()
        {
            string response = "<div style=\"width:100%;background-color:#f2f2f2;text-align:center;margin:10px;padding:20px;\">";
            response += "<h1 style=\"color:#333;\">Confirmation de votre entretien d'embauche chez TriWeb</h1>";
            response += "<img src=\"https://media.licdn.com/dms/image/C4D0BAQHYx-fVji8mCg/company-logo_200_200/0/1630569722329?e=2147483647&v=beta&t=avWhdFoMzCsgUhNSg25NdlidLeTvVn5vCyKZ7ybxuV0\" />";
            response += "<p style=\"font-size:16px;color:#555;\">Bonjour,</p>";
            response += "<p style=\"font-size:16px;color:#555;\">Nous avons bien reçu votre CV et nous sommes heureux de vous informer que vous avez été sélectionné pour passer à l'étape suivante du processus de recrutement chez TriWeb.</p>";
            response += "<p style=\"font-size:16px;color:#555;\">Avant de passer à l'entretien, nous vous demandons de passer un test en ligne.</p>";
            response += "<p style=\"font-size:16px;color:#555;\">Veuillez cliquer sur le lien ci-dessous pour accéder au test :</p>";
            response += "<a href=\"https://www.youtube.com/channel/UCsbmVmB_or8sVLLEq4XhE_A/join\">Veuillez cliquer sur le lien</a>";
            response += "<p style=\"font-size:16px;color:#555;margin-top:20px;\">Merci et bonne chance !</p>";
            response += "<p style=\"font-size:16px;color:#555;\">Cordialement,<br/>L'équipe de recrutement de TriWeb</p>";
            response += "<div><h1>Contactez-nous : contact@tri-web.com</h1></div>";
            response += "</div>";
            return response;
        }
    }
}