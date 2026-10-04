using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Participation
{
    public int Id { get; set; }

    public int? UserId { get; set; }

    public int? CourseId { get; set; }

    public DateTime? Date { get; set; }

    public virtual Course? Course { get; set; }
}
