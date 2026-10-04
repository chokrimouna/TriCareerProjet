using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Suivi
{
    public int IdSuivi { get; set; }

    public int? UserId { get; set; }

    public int? IdProcess { get; set; }

    public int? IdStatus { get; set; }

    public DateTime? Date { get; set; }

    public string? Remarque { get; set; }

    public int? IdUserRq { get; set; }

    public virtual User? User { get; set; }
}
