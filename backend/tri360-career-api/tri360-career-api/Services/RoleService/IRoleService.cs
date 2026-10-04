namespace Quizback.Services

{
    public interface IRoleService
    {
        Task<List<Role>?> GetAllRoles();
        Task<Role?> GetRoleById(int? RoleId);
        Task<bool> AddRole(Role Role);
        Task<bool> UpdateRole(Role Role);
        Task<bool> DeleteRole(int? RoleId);

    }
}


