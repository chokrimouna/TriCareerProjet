using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Response
{
    public int ResponseId { get; set; }

    public string? Value { get; set; }

    public int? UserId { get; set; }

    public int? QuestionId { get; set; }

    public virtual ICollection<ResponseDetail> ResponseDetails { get; set; } = new List<ResponseDetail>();
}
