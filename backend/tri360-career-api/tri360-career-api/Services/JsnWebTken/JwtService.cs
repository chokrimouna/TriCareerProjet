using Microsoft.AspNetCore.Http.HttpResults;
using QuizBack.Dto;

namespace Quizback.Services
{
    public class JwtService : IJWtService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public JwtService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        private const string SecretKey = "9quRH00i2VAjSsE3/v95uS16hnFjui9pu14RfOg5q5zTHRpvNGn++QrKo0v++nN4G1PZhmBTJxdBs2E8GMtwkzNHLN25fhT/9zQPelL0wIy9PYRxAvhuTh+MiGLTyA/DHS03ZcEf6zxKtKOs3+zkoJgRLhHAt48GQ15XY9Ja6UzEnVT/f1Q3se4sgLD8/Mp940QFu76wyQBDRRAI3dr7MkL5XMFgWvFelCseKc4bivN1IJFt944LeoPmnQ+qUBE1bqgjf0evLdV0TOVdLBco5y4k6ArM1ibWlnLaXPU7NlosUdAdWiP5LiYGpvYd79C6ytwiXBCWYDAWzmmxzofM0cf09UkIDCRhMa5zS/UOgks="; // Your secret key (must be at least 16 characters)

        public string GenerateToken(string sessionId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("sessionId", sessionId)
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddMinutes(30),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }


        public bool ValidateToken(string token)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SecretKey));
            var tokenHandler = new JwtSecurityTokenHandler();

            try
            {
                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = securityKey
                }, out SecurityToken validatedToken);

                return true;
            }
            catch
            {
                return false;
            }
        }

        public string DecryptToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtToken = tokenHandler.ReadJwtToken(token);

            if (jwtToken != null)
            {
                var sb = new StringBuilder();
                foreach (var claim in jwtToken.Claims)
                {
                    sb.AppendLine($"{claim.Type}: {claim.Value}");
                }
                return sb.ToString();
            }

            return null;
        }
    }
}
