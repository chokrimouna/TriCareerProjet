using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Quizback.Models;

namespace Quizback.Services
{
    public class JobPostingService : IJobPostingService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connectionString;
        
        public JobPostingService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task AddJobPosting(JobPosting jobPosting)
        {
            await using var transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (jobPosting == null)
                    throw new ArgumentNullException(nameof(jobPosting));

                await _quizDbContext.JobPostings.AddAsync(jobPosting);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                var exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "JobPostingService", "AddJobPosting");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Error adding job posting.", e);
            }
        }

        public async Task DeleteJobPosting(int Id)
        {
            await using var transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                var jobPosting = await _quizDbContext.JobPostings
                    .Include(j => j.Applications)
                    .FirstOrDefaultAsync(j => j.JobPostingId == Id);

                if (jobPosting == null)
                    throw new KeyNotFoundException($"JobPosting with ID {Id} not found.");

                // Unlink applications to avoid FK constraints
                foreach (var app in jobPosting.Applications)
                {
                    app.JobPostingId = null;
                }

                _quizDbContext.JobPostings.Remove(jobPosting);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                var exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "JobPostingService", "DeleteJobPosting");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Error deleting job posting.", e);
            }
        }

        public async Task<JobPosting?> GetJobPostingByID(int Id)
        {
            try
            {
                return await _quizDbContext.JobPostings.FirstOrDefaultAsync(u => u.JobPostingId == Id);
            }
            catch (Exception e)
            {
                var exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "JobPostingService", "GetJobPostingByID");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Error getting job posting by ID.", e);
            }
        }

        public async Task<List<JobPosting>?> GetJobPostings()
        {
            try
            {
                return await _quizDbContext.JobPostings.ToListAsync();
            }
            catch (Exception e)
            {
                var exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "JobPostingService", "GetJobPostings");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Error getting job postings.", e);
            }
        }

        public async Task<JobPosting?> UpdateJobPosting(JobPosting jobPosting)
        {
            await using var transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (jobPosting == null)
                    throw new ArgumentNullException(nameof(jobPosting));

                var existing = await _quizDbContext.JobPostings
                    .FirstOrDefaultAsync(j => j.JobPostingId == jobPosting.JobPostingId);

                if (existing == null)
                    return null;

                // Patch only mapped fields — avoids EF errors on unmapped frontend-only fields
                existing.PositionTitle = jobPosting.PositionTitle;
                existing.Description = jobPosting.Description;
                existing.Requirements = jobPosting.Requirements;
                existing.Missions = jobPosting.Missions;
                existing.Skills = jobPosting.Skills;
                existing.Experience = jobPosting.Experience;
                existing.Location = jobPosting.Location;
                existing.IsActive = jobPosting.IsActive;
                existing.DepartmentId = jobPosting.DepartmentId;
                existing.ApplicationDeadline = jobPosting.ApplicationDeadline;
                existing.DatePosted = jobPosting.DatePosted ?? existing.DatePosted;

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return existing;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[UpdateJobPosting] ERROR: {e.Message}");
                if (e.InnerException != null) Console.WriteLine($"[UpdateJobPosting] INNER: {e.InnerException.Message}");
                var exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "JobPostingService", "UpdateJobPosting");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                throw new ApplicationException("Error updating job posting.", e);
            }
        }
    }
}
