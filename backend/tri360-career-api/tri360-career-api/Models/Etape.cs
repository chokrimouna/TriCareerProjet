using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Etape
{
    public int IdEtapes { get; set; }

    public string? NameEtape { get; set; }

    public int? Ordre { get; set; }

    public bool? Active { get; set; }

    public virtual ICollection<Process> Processes { get; set; } = new List<Process>();
}
