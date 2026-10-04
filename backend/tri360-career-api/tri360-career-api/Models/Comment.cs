using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Comment
{
    public int Id { get; set; }

    public int? RecruitementProcessId { get; set; }

    public string? Text { get; set; }

    public virtual RecruitementProcess? RecruitementProcess { get; set; }
}
