using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class TestChecklistResponse
{
    public int Id { get; set; }

    public int? SessionId { get; set; }

    public string? CriterionName { get; set; }

    public int? Score { get; set; }

    public int? MaxScore { get; set; }

    public virtual Session? Session { get; set; }
}
