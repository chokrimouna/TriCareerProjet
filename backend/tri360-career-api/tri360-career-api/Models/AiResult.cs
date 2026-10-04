using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class AiResult
{
    public int IdResultAi { get; set; }

    public int? ApplicationId { get; set; }

    public string? Result { get; set; }

    public virtual Application? Application { get; set; }
}
