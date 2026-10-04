using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Quizback.Models;

public partial class RecruitementProcess
{
    public int RecruitementProcessId { get; set; }

    public DateTime? DatePlanification { get; set; }

    public int? ApplicationId { get; set; }

    public int? UserId { get; set; }

    public int? IdPosition { get; set; }

    public int? IdStatus { get; set; }

    public DateTime? Deadline { get; set; }

    public string? LastUpdateDate { get; set; }

    public DateTime? DataEva { get; set; }

    public int? EvaNote { get; set; }

    public string? EvaCommentaire { get; set; }

    public bool? Final { get; set; }

    // Lien envoyé au candidat
    public string? MeetLink { get; set; }

    // Lien utilisé par RH / Team Leader / Admin pour être host
    public string? HostMeetLink { get; set; }

    public string? MeetingProvider { get; set; }

    public string? ExternalMeetingId { get; set; }

    [NotMapped]
    public string? StepType { get; set; } // HR, Technical, Test

    [NotMapped]
    public int? EmojiRating { get; set; } // 1-5

    public virtual Application? Application { get; set; }

    public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();

    public virtual Pipline? IdPositionNavigation { get; set; }

    public virtual Status? IdStatusNavigation { get; set; }

    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    public virtual ICollection<Timeline> Timelines { get; set; } = new List<Timeline>();

    public virtual User? User { get; set; }
}