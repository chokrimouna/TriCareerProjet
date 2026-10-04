using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Status
{
    public int IdStatus { get; set; }

    public string? NameStatus { get; set; }

    public string? ColorS { get; set; }

    public virtual ICollection<RecruitementProcess> RecruitementProcesses { get; set; } = new List<RecruitementProcess>();
}
