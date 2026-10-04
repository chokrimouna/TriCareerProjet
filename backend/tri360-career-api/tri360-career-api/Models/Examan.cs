using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Examan
{
    public int IdExaman { get; set; }

    public int? UserId { get; set; }

    public string? Description { get; set; }

    public string? Titre { get; set; }

    public bool? Active { get; set; }

    public DateTime? DateCreation { get; set; }
    public int? Duration { get; set; }

    public virtual ICollection<DetailsExaman> DetailsExamen { get; set; } = new List<DetailsExaman>();

    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    public virtual User? User { get; set; }
}
