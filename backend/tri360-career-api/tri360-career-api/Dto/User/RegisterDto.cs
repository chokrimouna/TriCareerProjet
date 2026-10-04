namespace Quizback.Dto
{
    public class RegisterDto
    {
        public required string Name { get; set; }
        public required string Prename { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public string? Telephone { get; set; }
        public int RoleId { get; set; }
    }
}
