using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Payment
{
    public int PaymentId { get; set; }

    public decimal? Amount { get; set; }

    public DateTime? PaymentDate { get; set; }

    public int PaymentMethodeId { get; set; }

    public int? InvoiceId { get; set; }

    public virtual ICollection<EmailConfirmation> EmailConfirmations { get; set; } = new List<EmailConfirmation>();

    public virtual Invoice? Invoice { get; set; }

    public virtual PaymentMethode PaymentMethode { get; set; } = null!;
}
