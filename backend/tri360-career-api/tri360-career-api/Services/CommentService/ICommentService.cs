using System.Collections.Generic;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public interface ICommentService
    {
        Task<List<Comment>> GetAllComments();
        Task<Comment?> GetCommentById(int id);
        Task<bool> DeleteComment(int id);
        Task<bool> AddComment(Comment comment);
        Task<bool> UpdateComment(Comment comment);
        Task<List<Comment>> GetCommentsByRecruitmentProcessId(int recruitmentProcessId);
    }
}