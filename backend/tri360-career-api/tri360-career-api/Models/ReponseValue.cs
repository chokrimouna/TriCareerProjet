using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class ReponseValue
{
    public int IdReponse { get; set; }

    public int? IdQuestion { get; set; }

    public int? TimeReponse { get; set; }

    public bool? Answered { get; set; }

    public int? IdSession { get; set; }

    public virtual Question? IdQuestionNavigation { get; set; }

    public virtual Session? IdSessionNavigation { get; set; }

    public virtual ICollection<ReponseDetail> ReponseDetails { get; set; } = new List<ReponseDetail>();
}
