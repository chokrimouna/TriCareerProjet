

namespace Quizback.Controllers
{


    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IUserService _userService;
        private readonly TriCareerContext _context;

        public AuthController(IConfiguration configuration, IUserService userService, TriCareerContext context)
        {
            _config = configuration;
            _userService = userService;
            _context = context;
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto LoginDto)
        {
            if (LoginDto == null)
            {
                return BadRequest();
            }

            var loginRes = await _userService.Login(LoginDto.Email, LoginDto.Password);
            if (loginRes == null)
            {
                return NotFound();
            }
            User user = loginRes;
            var role = user.Role?.Description ?? user.RoleId?.ToString() ?? "";
            var username = user.Name ?? user.Email ?? "";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role)
            };
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                user = new { Id = user.UserId, Email = user.Email, Username = username, Role = role }
            });
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (dto == null)
            {
                return BadRequest("Invalid payload");
            }

            var email = (dto.Email ?? string.Empty).Trim();
            var exists = await _context.Users.AnyAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (exists)
            {
                return BadRequest("Email already in use");
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == dto.RoleId);
            if (role == null)
            {
                return BadRequest("Invalid role");
            }

            var user = new User
            {
                Name = dto.Name,
                Prename = dto.Prename,
                Email = email,
                Password = dto.Password,
                Telephone = dto.Telephone,
                RoleId = dto.RoleId,
                Etat = true
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            user.Role = role;
            var roleDescription = role.Description ?? user.RoleId?.ToString() ?? "";
            var username = user.Name ?? user.Email ?? "";
            var tokenValue = CreateToken(user);

            return Ok(new
            {
                token = tokenValue,
                user = new { Id = user.UserId, Email = user.Email, Username = username, Role = roleDescription }
            });
        }

        [HttpGet("roles")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles
                .Select(r => new { id = r.RoleId, description = r.Description })
                .ToListAsync();
            return Ok(roles);
        }

        [HttpGet("test-db")]
        public async Task<IActionResult> TestDb()
        {
            try
            {
                var users = await _context.Users.CountAsync();
                return Ok(new
                {
                    message = "DB connected",
                    userCount = users,
                    connectionString = _config.GetConnectionString("DefaultConnection")
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    error = ex.Message,
                    connectionString = _config.GetConnectionString("DefaultConnection")
                });
            }
        }

        [HttpPost("refreshtoken")]
        public async Task<IActionResult> RefreshToken()
        {
            string refreshToken = Request.Cookies["refreshToken"] == null ? "" : Request.Cookies["refreshToken"]!;

            var tokenHandler = new JwtSecurityTokenHandler();
            SecurityToken securityToken;
            ClaimsPrincipal principal = tokenHandler.ValidateToken(
                refreshToken, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateAudience = false,
                    ValidateIssuer = false,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)),
                }, out securityToken);
            if (principal == null)
            {
                return Unauthorized("Refresh token invalide");
            }
            string userName = principal!.Identity!.Name!;
            if (userName! == "")
            {
                return Unauthorized("Refresh token invalide");
            }
            User? user = await _userService.GetUserByUserEmailrefreshToken(userName, refreshToken!);

            if (user == null)
            {
                return Unauthorized("Refresh token invalide");
            }
            if (user.TokenRdateExpiration < DateTime.Now)
            {
                return Unauthorized("Refresh token expiré");
            }
            string token = CreateToken(user);
            user.Token = token;
            return Ok(await _userService.UpdatetUser(user));
        }
        [HttpGet("GetAllHeaders")]
        public async Task<IActionResult> GetAllHeaders()
        {
            string refreshToken = "";
            foreach (var header in Request.Headers)
            {
                if (header.Key!.Equals("refreshToken"))
                {
                    refreshToken = header.Value!;
                }
            }
            if (refreshToken.Length == 0 || refreshToken == null)
            {
                return Ok(new RetourMessage("Refresh token invalide", false, null!));
            }
            refreshToken = refreshToken.Split(" ").ToList()[1];
            var tokenHandler = new JwtSecurityTokenHandler();
            SecurityToken securityToken;

            var ValidateRefresh = false;
            string userName = "";
            try
            {
                ClaimsPrincipal principal = tokenHandler.ValidateToken(
               refreshToken, new TokenValidationParameters
               {
                   ValidateIssuerSigningKey = true,
                   ValidateAudience = false,
                   ValidateIssuer = false,
                   IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)),
               }, out securityToken);

                if (principal == null)
                {
                    return Ok(new RetourMessage("Refresh token invalide", false, null!));
                }
                userName = principal!.Identity!.Name!;
                if (userName! == "")
                {
                    return Ok(new RetourMessage("Refresh token invalide", false, null!));
                }
            }
            catch
            {
                ValidateRefresh = true;
            }
            if (ValidateRefresh == false)
            {
                Ok(new RetourMessage("Refresh token invalide", false, null!));
            }
            User? user = await _userService.GetUserByUserEmailrefreshToken(userName, refreshToken!);

            if (user == null)
            {
                return Ok(new RetourMessage("Refresh token invalide", false, null!));
            }
            if (user.TokenRdateExpiration < DateTime.Now)
            {
                return Ok(new RetourMessage("Refresh token expiré", false, null!));
            }
            string token = CreateToken(user);
            user.Token = token;
            return Ok(await _userService.UpdatetUser(user));
        }
        private RefreshToken GenerateRefreshToken(User user)
        {

            List<Claim> claims = new List<Claim> {
                new Claim(ClaimTypes.Name, user.Email!)

            };
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                    claims: claims,
                    signingCredentials: creds,
                    expires: DateTime.Now.AddSeconds(30)
                );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            var refreshToken = new RefreshToken
            {
                Token = jwt,
                DateCreation = DateTime.Now,
                DateEpiration = DateTime.Now.AddSeconds(30),
            };
            return refreshToken;
        }

        private void SetRefreshToken(RefreshToken newrefreshToken)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = newrefreshToken.DateEpiration
            };

            Response.Cookies.Append("refreshToken", newrefreshToken.Token, cookieOptions);
        }

        private string CreateToken(User user)
        {
            var role = user.Role?.Description ?? user.RoleId?.ToString() ?? "";
            var username = user.Name ?? user.Email ?? "";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role)
            };
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}