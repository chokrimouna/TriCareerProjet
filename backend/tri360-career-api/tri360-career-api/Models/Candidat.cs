using System;
using System.Collections.Generic;

namespace Quizback.Models;

public partial class Candidat
{
    public int CandidatId { get; set; }

    public string? Name { get; set; }

    public string? Prename { get; set; }

    public string? Email { get; set; }

    public string? Password { get; set; }

    public string? Telephone { get; set; }

    public string? Adresse { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? TokenRdateCreation { get; set; }

    public string? Token { get; set; }

    public DateTime? TokenRdateExpiration { get; set; }

    public string? PjCv { get; set; }

    public string? PjLettMot { get; set; }
}
