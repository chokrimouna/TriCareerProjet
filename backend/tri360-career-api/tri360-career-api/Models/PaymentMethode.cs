using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class PaymentMethode
{
    public int PaymentMethodeId { get; set; }

    public string? PaymentMehodeName { get; set; }

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
