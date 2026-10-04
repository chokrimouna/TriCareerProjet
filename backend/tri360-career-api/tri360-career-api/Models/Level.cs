using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Level
{
    public int Id { get; set; }

    public string? Description { get; set; }

    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();
}
