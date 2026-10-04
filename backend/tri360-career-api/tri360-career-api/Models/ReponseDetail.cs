using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class ReponseDetail
{
    public int Id { get; set; }

    public int? IdAnswers { get; set; }

    public int? IdReponseValue { get; set; }

    public string? Value { get; set; }

    public virtual Answer? IdAnswersNavigation { get; set; }

    public virtual ReponseValue? IdReponseValueNavigation { get; set; }
}
