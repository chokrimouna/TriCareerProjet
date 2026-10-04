 

namespace Quizback.Services
{
    public class CommentService : ICommentService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public CommentService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString");
        }

        public async Task<List<Comment>> GetAllComments()
        {
            List<Comment> comments = new List<Comment>();
            try
            {
                 comments = await _dbContext.Comments.ToListAsync();
                return comments;
            }
            catch (Exception e)
            {
                HandleException(e, "GetAllComments");
                return comments;
            }
        }

        public async Task<Comment?> GetCommentById(int id)
        {
            try
            {
                Comment? comment = await _dbContext.Comments.FindAsync(id);
                return comment;
            }
            catch (Exception e)
            {
                HandleException(e, "GetCommentById");
                return null;
            }
        }

        public async Task<bool> DeleteComment(int id)
        {       
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var comment = await _dbContext.Comments.FindAsync(id);
                if (comment == null)  return false;       
                _dbContext.Comments.Remove(comment);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();                 
                return true;

            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                HandleException(ex, "DeleteComment");
                return false;
            }
        }

        public async Task<bool>  AddComment(Comment comment)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (comment == null) return false;
                await _dbContext.Comments.AddAsync(comment);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                HandleException(e, "AddComment");
                return false;
            }
        }

        public async Task<bool> UpdateComment(Comment comment)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (comment == null) return false;
                _dbContext.Comments.Update(comment);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                HandleException(e, "UpdateComment");
                return false;
            }
        }

        public async Task<List<Comment>> GetCommentsByRecruitmentProcessId(int recruitmentProcessId)
        {
            try
            {
                List<Comment> comments = await _dbContext.Comments
                    .Where(c => c.RecruitementProcessId == recruitmentProcessId)
                    .ToListAsync();

                return comments;
            }
            catch (Exception e)
            {
                HandleException(e, "GetCommentsByRecruitmentProcessId");
                return null;
            }
        }

        private void HandleException(Exception e, string methodName)
        {
            ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "CommentService", methodName);
            ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
        }
    }
}