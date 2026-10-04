using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class HistoriqueApplication
{
    public int IdHistorique { get; set; }

    public int? IdApplication { get; set; }

    public int? IdState { get; set; }

    public string? JobPosting { get; set; }

    public DateTime? DateHist { get; set; }

    public virtual Application? IdApplicationNavigation { get; set; }

    public virtual State? IdStateNavigation { get; set; }
}
