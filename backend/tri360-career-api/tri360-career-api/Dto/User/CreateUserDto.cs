namespace Quizback.Dto
{
    public class CreateUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Prename { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int RoleId { get; set; }
        public string? Telephone { get; set; }
    }
}
