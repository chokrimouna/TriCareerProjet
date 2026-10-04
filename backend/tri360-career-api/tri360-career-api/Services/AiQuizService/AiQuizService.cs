using System.Text;
using System.Text.Json;

namespace Quizback.Services
{
  public class AiQuizService : IAiQuizService
  {
    private readonly IConfiguration _config;
    private readonly HttpClient _http;

    public AiQuizService(IConfiguration config)
    {
      _config = config;
      _http = new HttpClient();
    }

    public async Task<List<GeneratedQuestion>>
      GenerateQuiz(
        string topic,
        string difficulty,
        int questionCount,
        string language = "fr")
    {
      var apiKey = _config["Gemini:ApiKey"];
      var model = _config["Gemini:Model"]
        ?? "gemini-1.5-flash";
      var apiUrl = _config["Gemini:ApiUrl"]
        ?? "https://generativelanguage.googleapis.com/v1beta/models";

      var prompt = $@"
Tu es un expert en création de quiz techniques 
pour le recrutement. Réponds UNIQUEMENT en JSON.

Génère exactement {questionCount} questions QCM
sur le sujet: ""{topic}"".
Niveau: {difficulty}.
Langue: {(language == "fr" ? "Français" : "English")}.

Réponds UNIQUEMENT avec ce JSON valide, 
sans texte avant ou après:
{{
  ""questions"": [
    {{
      ""question"": ""texte de la question"",
      ""answers"": [
        {{""text"": ""réponse A"", ""isCorrect"": false}},
        {{""text"": ""réponse B"", ""isCorrect"": true}},
        {{""text"": ""réponse C"", ""isCorrect"": false}},
        {{""text"": ""réponse D"", ""isCorrect"": false}}
      ],
      ""explanation"": ""explication courte""
    }}
  ]
}}

Règles OBLIGATOIRES:
- Exactement {questionCount} questions
- Exactement 4 réponses par question
- Exactement 1 seule réponse correcte (isCorrect: true)
- Questions pertinentes pour le recrutement
- Niveau adapté à: {difficulty}
- UNIQUEMENT du JSON valide en réponse
";

      var requestBody = new
      {
        contents = new[]
        {
          new
          {
            parts = new[]
            {
              new { text = prompt }
            }
          }
        },
        generationConfig = new
        {
          temperature = 0.7,
          maxOutputTokens = 3000,
          responseMimeType = "application/json"
        }
      };

      var json = JsonSerializer.Serialize(requestBody);
      var content = new StringContent(
        json, Encoding.UTF8, "application/json");

      var url = $"{apiUrl}/{model}:generateContent" +
                $"?key={apiKey}";

      Console.WriteLine(
        $"[Gemini] Calling API: {url}");
      Console.WriteLine(
        $"[Gemini] Prompt length: {prompt.Length}");

      var response = await _http.PostAsync(url, content);

      if (!response.IsSuccessStatusCode)
      {
        var err = await response.Content
          .ReadAsStringAsync();
        Console.WriteLine($"[Gemini] Error: {err}");
        throw new Exception($"Gemini API error: {err}");
      }

      var resultJson = await response.Content
        .ReadAsStringAsync();

      Console.WriteLine(
        $"[Gemini] Raw response received");

      try
      {
        var doc = JsonDocument.Parse(resultJson);

        // Extract text from Gemini response
        var text = doc.RootElement
          .GetProperty("candidates")[0]
          .GetProperty("content")
          .GetProperty("parts")[0]
          .GetProperty("text")
          .GetString() ?? "";

        // Clean the response
        text = text.Trim();
        if (text.StartsWith("```json"))
          text = text[7..];
        if (text.StartsWith("```"))
          text = text[3..];
        if (text.EndsWith("```"))
          text = text[..^3];
        text = text.Trim();

        Console.WriteLine(
          $"[Gemini] Parsing JSON response: {text}");

        var quizDoc = JsonDocument.Parse(text);
        var questions = quizDoc.RootElement
          .GetProperty("questions");

        var result = new List<GeneratedQuestion>();

        foreach (var q in questions.EnumerateArray())
        {
          var gq = new GeneratedQuestion
          {
            QuestionText = q.GetProperty("question")
              .GetString() ?? "",
            Explanation = q.TryGetProperty(
              "explanation", out var exp)
              ? exp.GetString() ?? ""
              : ""
          };

          foreach (var a in q.GetProperty("answers")
            .EnumerateArray())
          {
            gq.Answers.Add(new GeneratedAnswer
            {
              Text = a.GetProperty("text")
                .GetString() ?? "",
              IsCorrect = a.GetProperty("isCorrect")
                .GetBoolean()
            });
          }

          result.Add(gq);
        }

        Console.WriteLine(
          $"[Gemini] Generated {result.Count} questions");

        return result;
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[Gemini] Critical Parsing Error: {ex.Message}");
        Console.WriteLine($"[Gemini] Raw JSON was: {resultJson}");
        throw new Exception($"Erreur de parsing Gemini: {ex.Message}");
      }
    }
  }
}
