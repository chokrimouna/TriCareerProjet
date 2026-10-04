using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Timeline
{
    public int TimelineId { get; set; }

    public int? RecruitementProcessId { get; set; }

    public DateTime? Date { get; set; }

    public string? Action { get; set; }

    public virtual RecruitementProcess? RecruitementProcess { get; set; }
}
