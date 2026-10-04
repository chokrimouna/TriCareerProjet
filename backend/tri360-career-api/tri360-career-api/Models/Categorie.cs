using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Categorie
{
    public int CategorieId { get; set; }

    public string? Description { get; set; }

    public string? Image { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<Course> Courses { get; set; } = new List<Course>();
}
