using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Offre
{
    public int IdOffre { get; set; }

    public string? NameOffre { get; set; }

    public string? Description { get; set; }

    public int? NbreVacancy { get; set; }
}
