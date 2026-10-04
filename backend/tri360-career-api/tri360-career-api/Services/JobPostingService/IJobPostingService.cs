namespace Quizback.Services
{
    public interface IJobPostingService
    {
        Task<List<JobPosting>?> GetJobPostings();
        Task<JobPosting?> GetJobPostingByID(int Id);
        Task AddJobPosting(JobPosting jobPosting);
        Task DeleteJobPosting(int Id);
        Task<JobPosting?> UpdateJobPosting(JobPosting jobPosting);
    }
}
