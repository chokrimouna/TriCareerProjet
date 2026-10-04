using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class State
{
    public int IdState { get; set; }

    public string? NameState { get; set; }

    public virtual ICollection<Application> Applications { get; set; } = new List<Application>();

    public virtual ICollection<HistoriqueApplication> HistoriqueApplications { get; set; } = new List<HistoriqueApplication>();
}
