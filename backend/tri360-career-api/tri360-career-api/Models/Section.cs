using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Section
{
    public int IdSection { get; set; }

    public string? NameSection { get; set; }

    public string? Competance { get; set; }

    public int? UserId { get; set; }

    public bool? Active { get; set; }

    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();

    public virtual User? User { get; set; }
}
