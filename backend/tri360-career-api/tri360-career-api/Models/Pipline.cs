using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Pipline
{
    public int Id { get; set; }

    public string? NamePipline { get; set; }

    public bool? Active { get; set; }

    public virtual ICollection<RecruitementProcess> RecruitementProcesses { get; set; } = new List<RecruitementProcess>();
}
