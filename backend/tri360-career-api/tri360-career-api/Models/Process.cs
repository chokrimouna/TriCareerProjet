using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Process
{
    public int IdProcess { get; set; }

    public int? UserId { get; set; }

    public int? IdEtapes { get; set; }

    public bool? Active { get; set; }

    public virtual Etape? IdEtapesNavigation { get; set; }

    public virtual ICollection<Suivi> Suivis { get; set; } = new List<Suivi>();

    public virtual User? User { get; set; }
}
