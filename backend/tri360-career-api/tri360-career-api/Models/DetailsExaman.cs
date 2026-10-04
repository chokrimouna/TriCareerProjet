using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class DetailsExaman
{
    public int IdDetailExaman { get; set; }

    public int? IdExaman { get; set; }

    public int? IdQuestion { get; set; }

    public virtual Examan? IdExamanNavigation { get; set; }

    public virtual Question? IdQuestionNavigation { get; set; }
}
