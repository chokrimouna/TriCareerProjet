using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Question
{
    public int IdQuestion { get; set; }

    public string? NameQuestion { get; set; }

    public string? Durée { get; set; }

    public string? Barem { get; set; }

    public int? IdSection { get; set; }

    public int? IdLevel { get; set; }

    public bool? Active { get; set; }

    public int? TimeReponse { get; set; }

    public string? Score { get; set; }

    public virtual ICollection<Answer> Answers { get; set; } = new List<Answer>();

    public virtual ICollection<DetailsExaman> DetailsExamen { get; set; } = new List<DetailsExaman>();

    public virtual Level? IdLevelNavigation { get; set; }

    public virtual Section? IdSectionNavigation { get; set; }

    public virtual ICollection<ReponseValue> ReponseValues { get; set; } = new List<ReponseValue>();
}
