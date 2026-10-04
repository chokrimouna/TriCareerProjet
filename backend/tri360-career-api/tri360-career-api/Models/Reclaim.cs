using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Reclaim
{
    public int ReclaimId { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? Tag { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<Course> Courses { get; set; } = new List<Course>();
}
