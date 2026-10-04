using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Answer
{
    public int Id { get; set; }

    public bool? EndIcon { get; set; }

    public string? Label { get; set; }

    public string? Type { get; set; }

    public string? Name { get; set; }

    public string? ClassName { get; set; }

    public string? Key { get; set; }

    public string? Value { get; set; }

    public int? IdQuestion { get; set; }

    public int? IsCorrect { get; set; }

    public virtual Question? IdQuestionNavigation { get; set; }

    public virtual ICollection<ReponseDetail> ReponseDetails { get; set; } = new List<ReponseDetail>();
}
