namespace Quizback.Services
{
    public class RoleService : IRoleService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connection;

        public RoleService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connection = configuration.GetConnectionString("ConnectionString")!;
        }


        public async Task<bool> AddRole(Role Role)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Role == null)
                {
                    return false;
                }
                await _quizDbContext.Roles.AddAsync(Role);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;

            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Rolesrepository", "AddRole");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }
        }

        public async Task<bool> DeleteRole(int? RoleId)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (RoleId == 0)
                {
                    return false;
                }
                Role? role = await _quizDbContext.Roles.FindAsync(RoleId);
                if (role == null)
                {
                    return false;
                }
                _quizDbContext.Roles.Remove(role);

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Rolesrepository", "DeleteRole");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e); // developement
                return false;
            }
        }

        public async Task<List<Role>?> GetAllRoles()
        {
            try
            {
                List<Role> Lroles = new List<Role>();
                Lroles = await _quizDbContext.Roles.ToListAsync();
                return Lroles;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Rolesrepository", "GetAllRoles");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return null;
            }
        }

        public async Task<Role?> GetRoleById(int? RoleId)
        {
            try
            {
                if (RoleId == 0)
                {
                    return null;
                }
                Role? role = await _quizDbContext.Roles.FindAsync(RoleId);
                if (role == null)
                {
                    return null;
                }
                return role;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Rolesrepository", "GetRoleById");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }

        }

        public async Task<bool> UpdateRole(Role Role)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (Role == null)
                {
                    return false;
                }
                _quizDbContext.Roles.Update(Role);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "Rolesrepository", "UpdateRole");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }

        }



    }
}
