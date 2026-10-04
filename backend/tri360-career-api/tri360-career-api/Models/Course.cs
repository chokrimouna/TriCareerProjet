using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Course
{
    public int CourseId { get; set; }

    public string? Title { get; set; }

    public string? Description { get; set; }

    public int? LevelId { get; set; }

    public int? CategorieId { get; set; }

    public string? Image { get; set; }

    public bool? IsActive { get; set; }

    public int? ReclaimId { get; set; }

    public int? Duration { get; set; }

    public int? FormerId { get; set; }

    public DateTime? Date { get; set; }

    public bool? IsFavorite { get; set; }

    public virtual Categorie? Categorie { get; set; }

    public virtual ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();

    public virtual ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();

    public virtual ICollection<Participation> Participations { get; set; } = new List<Participation>();

    public virtual Reclaim? Reclaim { get; set; }

    public virtual ICollection<Test> Tests { get; set; } = new List<Test>();
}
