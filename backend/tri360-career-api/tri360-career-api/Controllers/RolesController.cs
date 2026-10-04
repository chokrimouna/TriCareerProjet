namespace Quizback.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        // GET api/roles
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
          
            try
            {
                List<Role>? LRole = await _roleService.GetAllRoles();
                return Ok(LRole);
            }
            catch
            {
                return Problem();
            }
        }

        // GET api/roles/2
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoleByID(int id)
        {
            try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                Role? role = await _roleService.GetRoleById(id);
                return Ok(role);
            }
            catch
            {
                return Problem();
            }

    
        }

        // POST api/roles
        [HttpPost]
        public async Task<IActionResult> AddRole(Role role)
        {
            try
            {
                if (role == null)
                {
                    return BadRequest();
                }
                bool res = await _roleService.AddRole(role);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }


             
        }

        // PUT api/roles
        [HttpPut]
        public async Task<IActionResult> EditRole(Role role)
        {
          
            try
            {
                if (role == null)
                {
                    return BadRequest();
                }
                bool res = await _roleService.UpdateRole(role);
                return Ok(res);
            }
            catch
            {
                return Problem();
            }
        }

        // DELETE api/roles/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {

           try
            {
                if (id == 0 || id == null)
                {
                    return BadRequest();
                }
                bool role = await _roleService.DeleteRole(id);
                return Ok(role);
            }
            catch
            {
                return Problem();
            }
        }
    }
}
