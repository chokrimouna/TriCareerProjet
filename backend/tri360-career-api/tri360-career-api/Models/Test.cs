using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Test
{
    public int TestId { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public int? CourseId { get; set; }

    public bool? IsActive { get; set; }

    public virtual Course? Course { get; set; }
}
