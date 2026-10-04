using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Quizback.Services
{
    public class WherebyService : IWherebyService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public WherebyService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<WherebyMeetingResult?> CreateMeetingAsync(
            string summary,
            DateTime start,
            DateTime end)
        {
            var apiKey = _configuration["Whereby:ApiKey"];
            var roomNamePrefix = (_configuration["Whereby:RoomNamePrefix"] ?? "tricareer") + Guid.NewGuid().ToString().Substring(0, 4);

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                Console.WriteLine("[WherebyService] Missing Whereby API key.");
                return null;
            }

            // Whereby API usually rejects dates in the past. 
            // If the user planned for "yesterday", we'll force it to be in the future for the room to be created.
            var effectiveEnd = end.ToUniversalTime();
            if (effectiveEnd <= DateTime.UtcNow)
            {
                Console.WriteLine($"[WherebyService] Warning: End date {effectiveEnd} is in the past. Forcing to 24h from now.");
                effectiveEnd = DateTime.UtcNow.AddDays(1);
            }

            var requestBody = new
            {
                endDate = effectiveEnd.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                isLocked = true,
                roomMode = "normal",
                roomNamePrefix = roomNamePrefix,
                roomNamePattern = "uuid",
                fields = new[] { "hostRoomUrl" }
            };

            var json = JsonSerializer.Serialize(requestBody);
            Console.WriteLine($"[WherebyService Debug] Request Body: {json}");

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://api.whereby.dev/v1/meetings"
            );

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            try 
            {
                using var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[WherebyService Error] {response.StatusCode}: {responseBody}");
                    return null;
                }

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                try 
                {
                    var result = JsonSerializer.Deserialize<WherebyMeetingResult>(responseBody, options);

                    if (result == null || string.IsNullOrWhiteSpace(result.RoomUrl))
                    {
                        Console.WriteLine($"[WherebyService] Invalid response structure: {responseBody}");
                        return null;
                    }

                    Console.WriteLine($"[WherebyService] Success! Room: {result.RoomUrl}");
                    return result;
                }
                catch (JsonException jex)
                {
                    Console.WriteLine($"[WherebyService Serialization Error] {jex.Message}. Body: {responseBody}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WherebyService Critical Error] {ex.Message}");
                return null;
            }
        }
    }
}