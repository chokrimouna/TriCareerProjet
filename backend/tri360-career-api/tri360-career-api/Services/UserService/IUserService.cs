namespace Quizback.Services


{

    public interface IUserService
    {
        Task<List<User>> GetUsers();
        Task<User?> GetUserByID(int Id);
        Task<List<User>> GetUsersByRole(int roleId);

        Task<bool> AddUser(User user);
        Task<bool> DeleteUser(int Id);
        Task<bool> UpdatetUser(User user);

      
        Task<User?> Login(string username, string password);
        Task<User?> UpdatetUserLogin(User user);

        Task<User?> GetUserByUserEmailrefreshToken(string username, string refreshToken);
        Task<List<User>?> GetUsersSansCandidat();
    }


}


