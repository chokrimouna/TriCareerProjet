using System;

namespace Quizback.Models;

// US20 : rapport d'évaluation IA stocké en base
public partial class EvaluationReport
{
    public int Id { get; set; }

    public int ApplicationId { get; set; }

    public string? Content { get; set; }

    public DateTime CreatedAt { get; set; }
}
