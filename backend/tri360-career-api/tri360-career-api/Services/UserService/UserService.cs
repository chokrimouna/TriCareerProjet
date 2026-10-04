using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Quizback.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public class UserService : IUserService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connection;

        public UserService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connection = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<User>> GetUsers()
        {
            List<User> LUserdb = new List<User>();
            try
            {
                LUserdb = await _quizDbContext.Users
                    .Where(u => u.Etat != false)
                    .Select(u=> new User()
                    {
                        Adresse = u.Adresse,
                        Email= u.Email,
                        Etat= u.Etat,
                        Examen = u.Examen,
                        Name= u.Name,
                        Notifications = u.Notifications,
                        Password = u.Password,
                        Prename = u.Prename,
                        RecruitementProcesses = u.RecruitementProcesses,
                        RefreshToken = u.RefreshToken  ,
                        Role = u.Role  ,
                        RoleId = u.RoleId,
                        Telephone = u.Telephone,
                        Token= u.Token,
                        UserId = u.UserId,
                        Suivis= u.Suivis,
                        DepartmentId = u.DepartmentId,
                        Department = u.Department != null ? new Department {
                            DepartmentId = u.Department.DepartmentId,
                            Name = u.Department.Name
                        } : null,
                        Applications = u.Applications.Select(a => new Application {
                            ApplicationId = a.ApplicationId,
                            NameApplication = a.NameApplication,
                            Email = a.Email,
                            IdState = a.IdState,
                            HrScore = a.HrScore,
                            TechScore = a.TechScore,
                            TestScore = a.TestScore,
                            FinalScore = a.FinalScore,
                            AdminDecision = a.AdminDecision
                        }).ToList()
                    })
                    .ToListAsync();

                return LUserdb;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "GetUsers");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return LUserdb;
            }
        }

        public async Task<User?> GetUserByID(int Id)
        {
            try
            {
                User? user = await _quizDbContext.Users
                    .Include(u => u.Examen)
                    .FirstOrDefaultAsync(u => u.UserId == Id);

                return user;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "GetUserByID");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return null;
            }
        }

        public async Task<List<User>> GetUsersByRole(int roleId)
        {
            List<User> usersByRole = new List<User>();
            try
            {

                usersByRole = await _quizDbContext.Users
                    .Where(u => u.RoleId == roleId)
                    .Select(u => new User()
                    {
                        Adresse = u.Adresse,
                        Applications = u.Applications,
                        Email = u.Email,
                        Etat = u.Etat,
                        Examen = u.Examen,
                        Name = u.Name,
                        Notifications = u.Notifications,
                        Password = u.Password,
                        Prename = u.Prename,
                        RecruitementProcesses = u.RecruitementProcesses,
                        Role = u.Role,
                        RoleId = u.RoleId,
                        UserId = u.UserId,
                        Telephone = u.Telephone,
                        Suivis = u.Suivis,
                        Token = u.Token,
                        Sections = u.Sections,
                        DepartmentId = u.DepartmentId,
                        Department = u.Department != null ? new Department {
                            DepartmentId = u.Department.DepartmentId,
                            Name = u.Department.Name
                        } : null
                    })
                    .ToListAsync();

                return usersByRole;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "GetUsersByRole");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                return usersByRole;
            }
        }

        public async Task <bool> AddUser(User user)
        {

            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (user == null) return false;
                user.Etat =true;
                await _quizDbContext.Users.AddAsync(user);
                await _quizDbContext.SaveChangesAsync();
               
                transaction.Commit();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "AddUser");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }

        }

        public async Task<bool> DeleteUser (int Id)
        {

            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                User? user = await _quizDbContext.Users.FindAsync(Id);
                if (user == null) return false;
                user.Etat = false;
                _quizDbContext.Users.Update(user);
                await _quizDbContext.SaveChangesAsync();
                transaction.Commit();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "DeleteUser");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }
        }

        public async Task<bool> UpdatetUser(User user)
        {
             await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (user == null) return false;

                var existingUser = await _quizDbContext.Users.FindAsync(user.UserId);
                if (existingUser == null) return false;

                existingUser.Name = user.Name ?? existingUser.Name;
                existingUser.Prename = user.Prename ?? existingUser.Prename;
                existingUser.Email = user.Email ?? existingUser.Email;
                existingUser.Telephone = user.Telephone ?? existingUser.Telephone;
                existingUser.RoleId = user.RoleId ?? existingUser.RoleId;
                existingUser.DepartmentId = user.DepartmentId;
                existingUser.Adresse = user.Adresse ?? existingUser.Adresse;

                _quizDbContext.Users.Update(existingUser);
                await _quizDbContext.SaveChangesAsync();
                transaction.Commit();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "UpdatetUser");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return false;
            }
        }

        public async Task<User?> UpdatetUserLogin(User user)
        {
            await using IDbContextTransaction transaction = _quizDbContext.Database.BeginTransaction();
            try
            {
                if (user == null) return null;
                _quizDbContext.Users.Update(user);
                await _quizDbContext.SaveChangesAsync();
                transaction.Commit();
                return user;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "UpdatetUser");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }
        }

        public async Task<List<User>?> GetUsersSansCandidat()
        {
            List<User> LUserdb = new List<User>();
            try
            {
                  LUserdb = await _quizDbContext.Users
                    .Where(u => u.RoleId != 6 && u.Etat != false) // Exclure les candidats et les utilisateurs supprimés
                    .Select( u =>  new User()
                    {
                        Adresse = u.Adresse,
                        Applications = u.Applications,
                        Email = u.Email,
                        Etat = u.Etat,
                        Examen = u.Examen,
                        Name = u.Name,
                        Notifications = u.Notifications,
                        Password = u.Password,
                        Prename = u.Prename,
                        RecruitementProcesses = u.RecruitementProcesses,
                        Role = u.Role,
                        RoleId = u.RoleId,
                        UserId = u.UserId,
                        Telephone = u.Telephone,
                        Suivis = u.Suivis,
                        Token = u.Token,
                        Sections = u.Sections,
                        DepartmentId = u.DepartmentId,
                        Department = u.Department != null ? new Department {
                            DepartmentId = u.Department.DepartmentId,
                            Name = u.Department.Name
                        } : null
                    })
                    .ToListAsync();

                return LUserdb;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "GetUsersSansCandidat");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return LUserdb;
            }
        }

        public async Task<User?> Login(string username, string password)
        {
            try
            {
                Console.WriteLine($"[UserService.Login] Searching by Email: {username}");
                var loginQuery = _quizDbContext.Users
                    .Where(x => x.Email == username && x.Password == password)
                    .Select(u => new User(){
                        Name = u.Name,
                        Prename = u.Prename,
                        Email = u.Email,
                        Adresse = u.Adresse,
                        Password = u.Password,
                        Etat = u.Etat,
                        RoleId = u.RoleId,
                        UserId = u.UserId,
                        Telephone = u.Telephone,
                        Token = u.Token,
                        TokenRdateCreation = u.TokenRdateCreation,
                        TokenRdateExpiration = u.TokenRdateExpiration,
                        RefreshToken = u.RefreshToken,
                        Role = u.Role != null ? new Role(){
                            RoleId = u.Role.RoleId,
                            Description = u.Role.Description
                        } : null
                    });

                Console.WriteLine("[UserService.Login] SQL query:");
                Console.WriteLine(loginQuery.ToQueryString());

                User? user = await loginQuery.FirstOrDefaultAsync();
                Console.WriteLine(user == null
                    ? "[UserService.Login] User found: NO"
                    : "[UserService.Login] User found: YES");
                return user;
            }
            catch (Exception e)
            {
                Console.WriteLine($"[UserService.Login] Exception: {e}");
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "Login");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }
        }

        public async Task<User?> GetUserByUserEmailrefreshToken(string username, string refreshToken)
        {
            try
            {
                User? user = await _quizDbContext.Users
                    .Where(x => x.Email == username && x.RefreshToken == refreshToken)
                    .FirstOrDefaultAsync();

                return user;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "UserService", "GetUserByUserEmailrefreshToken");
                ExceptionCatch.InsertDataException(_connection, exceptionDb);
                Console.WriteLine(e);
                return null;
            }
        }
    }
}