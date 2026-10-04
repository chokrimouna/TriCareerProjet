namespace Quizback.Services
{
    public interface ILevelService
    {
        Task<List<Level>?> GetAllLevels();
        Task<Level?> GetLevelById(int? LevelId);
        Task<bool> AddLevel(Level Level);
        Task<bool> UpdateLevel(Level Level);
        Task<bool> DeleteLevel(int? LevelId);

    }
}
