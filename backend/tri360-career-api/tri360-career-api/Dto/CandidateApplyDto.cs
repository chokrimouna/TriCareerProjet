using Microsoft.AspNetCore.Http;

namespace QuizBack.Dto
{
    public class CandidateApplyDto
    {
        public string FirstName { get; set; } = null!;
        public string LastName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public int JobPostingId { get; set; }
        public string? Motivation { get; set; }
        public IFormFile Cv { get; set; } = null!;
    }
}
