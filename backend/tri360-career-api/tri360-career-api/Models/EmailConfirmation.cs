using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class EmailConfirmation
{
    public int ConfirmationId { get; set; }

    public string? ConfirmationToken { get; set; }

    public DateTime? SentDate { get; set; }

    public bool? IsConfirmed { get; set; }

    public int? UserId { get; set; }

    public int? PaymentId { get; set; }

    public virtual Payment? Payment { get; set; }
}
