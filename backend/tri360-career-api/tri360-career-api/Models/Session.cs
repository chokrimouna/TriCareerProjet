using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quizback.Models;

public partial class Session
{
    public string? EncryptedSessinId { get; set; }

    public int SessionId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public int? ExamnId { get; set; }

    public int? ApplicationId { get; set; }

    public bool? SessionState { get; set; }

    public int? RecruitementProcessId { get; set; }

    [NotMapped]
    public double? Score { get; set; }

    // US17 - Anti-triche : nombre de sorties d'onglet détectées pendant le test
    public int? TabSwitchCount { get; set; }

    public virtual Examan? Examn { get; set; }

    public virtual Application? Application { get; set; }

    public virtual RecruitementProcess? RecruitementProcess { get; set; }

    public virtual ICollection<ReponseValue> ReponseValues { get; set; } = new List<ReponseValue>();
}
