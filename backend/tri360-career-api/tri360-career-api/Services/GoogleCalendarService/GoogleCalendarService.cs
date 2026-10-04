using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Microsoft.Extensions.Configuration;

namespace Quizback.Services
{
    public class GoogleCalendarService : IGoogleCalendarService
    {
        private readonly IConfiguration _configuration;
        private readonly string? _serviceAccountEmail;
        private readonly string? _privateKey;
        private readonly string? _fallbackImpersonateUser;
        private readonly string _timeZone;

        public GoogleCalendarService(IConfiguration configuration)
        {
            _configuration = configuration;
            _serviceAccountEmail = _configuration["GoogleAPI:ServiceAccountEmail"];
            _privateKey = _configuration["GoogleAPI:PrivateKey"]?.Replace("\\n", "\n");
            _fallbackImpersonateUser = _configuration["GoogleAPI:ImpersonateUser"];
            _timeZone = _configuration["GoogleAPI:TimeZone"] ?? "Europe/Paris";
        }

        public async Task<string> CreateMeetLink(
            string summary,
            DateTime start,
            DateTime end,
            List<string> attendees,
            string? plannerEmail = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(_serviceAccountEmail) ||
                    _serviceAccountEmail.Contains("REPLACE") ||
                    string.IsNullOrWhiteSpace(_privateKey) ||
                    _privateKey.Contains("REPLACE"))
                {
                    Console.WriteLine("[GoogleCalendarService] Google credentials are not configured.");
                    return "";
                }

                if (start >= end)
                {
                    Console.WriteLine("[GoogleCalendarService] Invalid interview dates: start must be before end.");
                    return "";
                }

                var scopes = new[] { CalendarService.Scope.Calendar };

                // Determine who to impersonate.
                string? userToImpersonate = !string.IsNullOrWhiteSpace(plannerEmail)
                    ? plannerEmail
                    : _fallbackImpersonateUser;

                ServiceAccountCredential credential;

                // IMPORTANT: Impersonation only works with Google Workspace accounts.
                // Regular @gmail.com accounts cannot be impersonated.
                bool canImpersonate = !string.IsNullOrWhiteSpace(userToImpersonate) && !userToImpersonate.EndsWith("@gmail.com");

                if (canImpersonate)
                {
                    Console.WriteLine($"[GoogleCalendarService] Attempting impersonation for Workspace user: {userToImpersonate}");
                    credential = new ServiceAccountCredential(
                        new ServiceAccountCredential.Initializer(_serviceAccountEmail)
                        {
                            Scopes = scopes,
                            User = userToImpersonate
                        }.FromPrivateKey(_privateKey)
                    );
                }
                else
                {
                    Console.WriteLine($"[GoogleCalendarService] Using Service Account identity (Impersonation skipped for regular Gmail or null: {userToImpersonate})");
                    credential = new ServiceAccountCredential(
                        new ServiceAccountCredential.Initializer(_serviceAccountEmail)
                        {
                            Scopes = scopes
                        }.FromPrivateKey(_privateKey)
                    );
                }

                var service = new CalendarService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "TriCareer"
                });

                var newEvent = new Event
                {
                    Summary = summary,
                    Description = "Entretien planifié via TriCareer. " +
                                  "Le candidat reçoit le lien par email et doit attendre l'approbation du recruteur pour rejoindre.",
                    Start = new EventDateTime { DateTime = start, TimeZone = _timeZone },
                    End = new EventDateTime { DateTime = end, TimeZone = _timeZone },
                    
                    // We don't add the candidate as an attendee to force "Ask to join" approval logic
                    Attendees = null,
                    
                    GuestsCanInviteOthers = false,
                    GuestsCanSeeOtherGuests = false,
                    Visibility = "private",

                    ConferenceData = new ConferenceData
                    {
                        CreateRequest = new CreateConferenceRequest
                        {
                            RequestId = Guid.NewGuid().ToString("N"),
                            ConferenceSolutionKey = new ConferenceSolutionKey { Type = "hangoutsMeet" }
                        }
                    }
                };

                var request = service.Events.Insert(newEvent, "primary");
                request.ConferenceDataVersion = 1;
                request.SendUpdates = EventsResource.InsertRequest.SendUpdatesEnum.None;

                var createdEvent = await request.ExecuteAsync();

                var meetLink = createdEvent.HangoutLink ?? 
                              createdEvent.ConferenceData?.EntryPoints?.FirstOrDefault(e => e.EntryPointType == "video")?.Uri;

                if (string.IsNullOrWhiteSpace(meetLink))
                {
                    Console.WriteLine("[GoogleCalendarService] Event created but no Meet link was returned.");
                    return "";
                }

                Console.WriteLine($"[GoogleCalendarService] Success! Meet link: {meetLink}");
                return meetLink;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleCalendarService Error] {ex}");
                // If impersonation failed, try one last time as the Service Account itself
                if (!string.IsNullOrEmpty(plannerEmail))
                {
                    Console.WriteLine("[GoogleCalendarService] Impersonation failed. Retrying without it...");
                    return await CreateMeetLink(summary, start, end, attendees, null);
                }
                return "";
            }
        }
    }
}