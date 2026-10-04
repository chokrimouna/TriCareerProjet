using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Quizback.Services;
using Quizback.Dto.User;
using System.Security.Claims;

namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly TriCareerContext _context;
        private readonly IEmailService _emailService;

        public UsersController(IUserService userService, TriCareerContext context, IEmailService emailService)
        {
            _userService = userService;
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("GetUsersSansCandidat")]
        public async Task<IActionResult> GetUsersSansCandidat()
        {
            try
            {
                List<User> users = await _userService.GetUsersSansCandidat();
                return Ok(users);
            }
            catch
            {
                return BadRequest();
            }
         
        }

        // GET api/users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            try
            {
                List<User> users = await _userService.GetUsers();
                return Ok(users);
            }
            catch
            {
                return BadRequest();
            }
       
        }

        // GET api/users/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserByID(int id)
        {
            try
            {
                if (id == 0) return BadRequest();
                User user = await _userService.GetUserByID(id);
                if (user == null)
                {
                    return NotFound();

                }
                return Ok(user);
            }
            catch
            {
                return BadRequest();
            }
        }

        // POST api/users
        [HttpPost]
        public async Task<IActionResult> AddUser(User user)
        {
            try
            {
                if (user == null) return BadRequest();
                bool res = await _userService.AddUser(user);
                return Ok(res);
            }
            catch
            {
                return BadRequest();
            }
        }

        // PUT api/users
        [HttpPut]
        public async Task<IActionResult> EditUser(User user)
        {
            try
            {
                if (user == null) return BadRequest();
                bool res = await _userService.UpdatetUser(user);
                return Ok(res);

            }
            catch
            {
                return BadRequest();
            }
        }

        // PUT api/users/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
        {
            try
            {
                if (user == null) return BadRequest();
                user.UserId = id;
                bool res = await _userService.UpdatetUser(user);
                if (!res) return NotFound();
                return Ok(new { message = "User updated" });
            }
            catch (Exception ex)
            {
                return Problem(ex.Message);
            }
        }

        // DELETE api/users/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            if (id == 0) return BadRequest();
            bool res = await _userService.DeleteUser(id);
            if (!res) return NotFound();
            return Ok(new { message = "User deactivated (soft delete)" });
        }

        [HttpGet("GetUsersByRole/{roleId}")]
        public async Task<IActionResult> GetUsersByRole(int roleId)
        {
            try
            {
                if (roleId == 0) { return BadRequest(); }
                List<User> users = await _userService.GetUsersByRole(roleId);
                return Ok(users);
            }
            catch
            {
                return Problem();
            }

        }

        [HttpPost("create")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Name))
                {
                    return BadRequest("Invalid payload");
                }

                var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (existing != null)
                {
                    return BadRequest("Email already in use");
                }

                var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == dto.RoleId);
                if (role == null)
                {
                    return BadRequest("Invalid roleId");
                }

                var generatedPassword = PasswordGenerator.Generate(dto.Name, dto.Prename);
                var user = new User
                {
                    Name = dto.Name,
                    Prename = dto.Prename,
                    Email = dto.Email,
                    Password = generatedPassword,
                    RoleId = dto.RoleId,
                    Telephone = dto.Telephone,
                    Etat = true
                };

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                try
                {
                    await _emailService.SendCredentialsEmail(
                        user.Email!,
                        $"{user.Name} {user.Prename}".Trim(),
                        generatedPassword,
                        role.Description ?? role.RoleId.ToString()
                    );

                    return Ok(new
                    {
                        message = "User created and credentials sent",
                        user = new
                        {
                            id = user.UserId,
                            name = $"{user.Name} {user.Prename}".Trim(),
                            email = user.Email,
                            role = role.Description ?? role.RoleId.ToString()
                        }
                    });
                }
                catch (Exception)
                {
                    return Ok(new
                    {
                        message = "User created but email failed to send",
                        user = new
                        {
                            id = user.UserId,
                            name = $"{user.Name} {user.Prename}".Trim(),
                            email = user.Email,
                            role = role.Description ?? role.RoleId.ToString()
                        },
                        generatedPassword
                    });
                }
            }
            catch (Exception ex)
            {
                return Problem(ex.Message);
            }
        }

        [HttpPost("invite-candidate")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> InviteCandidate([FromBody] InviteCandidateDto dto)
        {
            try
            {
                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Name))
                {
                    return BadRequest("Invalid payload");
                }

                var existingUser = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == dto.Email);
                var generatedPassword = PasswordGenerator.GenerateForCandidate(dto.Name, dto.Prename, dto.Email);

                if (existingUser != null)
                {
                    existingUser.Password = generatedPassword;
                    await _context.SaveChangesAsync();

                    var existingRoleName = existingUser.Role?.Description ?? existingUser.RoleId?.ToString() ?? "Candidate";
                    try
                    {
                        await _emailService.SendCredentialsEmail(
                            existingUser.Email!,
                            $"{existingUser.Name} {existingUser.Prename}".Trim(),
                            generatedPassword,
                            existingRoleName
                        );
                    }
                    catch (Exception)
                    {
                        // Keep user update even if email fails.
                    }

                    return Ok(new
                    {
                        message = "Existing user found, credentials were regenerated and invitation attempted",
                        user = new
                        {
                            id = existingUser.UserId,
                            name = $"{existingUser.Name} {existingUser.Prename}".Trim(),
                            email = existingUser.Email,
                            role = existingRoleName
                        },
                        generatedPassword
                    });
                }

                var candidateRole = await _context.Roles
                    .OrderBy(r => r.RoleId)
                    .FirstOrDefaultAsync(r => r.Description != null && r.Description.ToLower() == "candidate")
                    ?? await _context.Roles.OrderBy(r => r.RoleId).FirstOrDefaultAsync();

                if (candidateRole == null)
                {
                    return BadRequest("No role available to assign candidate.");
                }

                var user = new User
                {
                    Name = dto.Name,
                    Prename = dto.Prename,
                    Email = dto.Email,
                    Password = generatedPassword,
                    RoleId = candidateRole.RoleId,
                    Etat = true
                };

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                try
                {
                    await _emailService.SendCredentialsEmail(
                        user.Email!,
                        $"{user.Name} {user.Prename}".Trim(),
                        generatedPassword,
                        candidateRole.Description ?? candidateRole.RoleId.ToString()
                    );
                }
                catch (Exception)
                {
                    // Keep creation even if email fails.
                }

                return Ok(new
                {
                    message = "Invitation processed",
                    user = new
                    {
                        id = user.UserId,
                        name = $"{user.Name} {user.Prename}".Trim(),
                        email = user.Email,
                        role = candidateRole.Description ?? candidateRole.RoleId.ToString()
                    },
                    generatedPassword
                });
            }
            catch (Exception ex)
            {
                return Problem(ex.Message);
            }
        }

        [HttpPut("{id}/role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.RoleId = dto.RoleId;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Role updated" });
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UserUpdateStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            user.Etat = dto.Active;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Status updated" });
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(userId));
            if (user == null) return NotFound();

            if (!string.IsNullOrEmpty(dto.Name)) user.Name = dto.Name;
            if (!string.IsNullOrEmpty(dto.Prename)) user.Prename = dto.Prename;
            if (!string.IsNullOrEmpty(dto.Telephone)) user.Telephone = dto.Telephone;
            if (!string.IsNullOrEmpty(dto.Adresse)) user.Adresse = dto.Adresse;
            if (!string.IsNullOrEmpty(dto.Avatar)) user.Token = dto.Avatar;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated",
                user = new
                {
                    user.UserId,
                    user.Name,
                    user.Email,
                    user.Prename,
                    user.Telephone,
                    Avatar = user.Token
                }
            });
        }
    }
}