using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Invoice
{
    public int InvoiceId { get; set; }

    public DateTime? InvoiceDate { get; set; }

    public decimal? TotaleAmount { get; set; }

    public string? PaymentStatus { get; set; }

    public int? UserId { get; set; }

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
