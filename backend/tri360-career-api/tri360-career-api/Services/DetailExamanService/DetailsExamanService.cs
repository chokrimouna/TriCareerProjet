using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QuizBack.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Transactions;

namespace Quizback.Services
{
    public class DetailsExamanService : IDetailsExamanService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public DetailsExamanService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<DetailsExaman>?> GetAllDetailsExaman()
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var detailsExamens = await _dbContext.DetailsExamen
                    .ToListAsync();

                return detailsExamens;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception
                return null;
            }
        }

        public async Task<DetailsExaman?> GetDetailsExamanById(int detailsExamanId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var detailsExaman = await _dbContext.DetailsExamen
                    .FirstOrDefaultAsync(de => de.IdDetailExaman == detailsExamanId);

                return detailsExaman;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception
                return null;
            }
        }

        public async Task AddDetailsExaman(DetailsExaman detailsExaman)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (detailsExaman == null)
                    throw new ArgumentNullException(nameof(detailsExaman));

                _dbContext.DetailsExamen.Add(detailsExaman);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception
                throw;
            }
        }

        public async Task UpdateDetailsExaman(DetailsExaman detailsExaman)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (detailsExaman == null)
                    throw new ArgumentNullException(nameof(detailsExaman));

                _dbContext.DetailsExamen.Update(detailsExaman);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception
                throw;
            }
        }

        public async Task DeleteDetailsExaman(int detailsExamanId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var detailsExaman = await _dbContext.DetailsExamen.FindAsync(detailsExamanId);
                if (detailsExaman != null)
                {
                    _dbContext.DetailsExamen.Remove(detailsExaman);
                    await _dbContext.SaveChangesAsync();
                }
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Gérer l'exception
                throw;
            }
        }

        public async Task<List<DetailsExaman>?> GetAllDetailsExamanByIdExamen(int IdExaman)
        {
            try
            {
                List<DetailsExaman> detailsExamens = await _dbContext.DetailsExamen
                    .Where(x => x.IdExaman == IdExaman)
                    .Include(x => x.IdQuestionNavigation)
                    .ThenInclude(x => x!.Answers)
                    .Include(x => x.IdExamanNavigation)
                    .ToListAsync();

                return detailsExamens;
            }
            catch (Exception)
            {
                // Gérer l'exception
                return null;
            }
        }

        public async Task AddDeleteDetailsExaman(List<DetailsExaman>? detailsExaman)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (detailsExaman == null)
                    throw new ArgumentNullException(nameof(detailsExaman));

                var existingDetailsExamen = await _dbContext.DetailsExamen
                    .Where(x => x.IdExaman == detailsExaman[0].IdExaman)
                    .ToListAsync();

                _dbContext.DetailsExamen.RemoveRange(existingDetailsExamen);
                await _dbContext.DetailsExamen.AddRangeAsync(detailsExaman);

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Examan?> AddExamanWithQuestions(ExamanWithQuestionsDto detailsExaman)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (detailsExaman == null) return null;

                var newExaman = new Examan
                {
                    UserId = detailsExaman.UserId,
                    Description = detailsExaman.Description,
                    Titre = detailsExaman.Titre,
                    Active = detailsExaman.Active,
                    DateCreation = detailsExaman.DateCreation,
                    Duration = detailsExaman.Duration
                };

                _dbContext.Add(newExaman);
                await _dbContext.SaveChangesAsync();

                if (detailsExaman.QuestionListId != null)
                {

                    foreach (var item in detailsExaman.QuestionListId)
                    {

                        var newDetailEx = new DetailsExaman
                        {
                            IdExaman = newExaman.IdExaman,
                            IdQuestion = (int)item
                        };

                        _dbContext.Add(newDetailEx);
                    }

                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return newExaman;
            }
            catch (System.Exception)
            {
                await transaction.RollbackAsync();
                return null;
            }
        }

        public async Task DeleteQuestionFromDetailEx(DetaildelaitDto detaildata)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (detaildata == null) return;

                List<DetailsExaman> data = await _dbContext.DetailsExamen
                .Where(D => D.IdQuestion == detaildata.IdQuestion && D.IdExaman == detaildata.IdExaman)
                .ToListAsync();

                if (data == null) return;

                foreach (var item in data)
                {
                    _dbContext.Remove(item);
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

            }
            catch (System.Exception)
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task DeleteSectionFromDetailEx(DeletedelaitSectionExamanDto detaildata)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                List<int>? Quest = await _dbContext.Questions.Where(q => q.IdSection == detaildata.IdSection).Select(x => x.IdQuestion).ToListAsync();

                if (Quest == null) return;

                List<DetailsExaman>? details = await _dbContext.DetailsExamen.Where(d => d.IdExaman == detaildata.IdExaman).ToListAsync();

                foreach (var detail in details)
                {
                    if (Quest.Contains((int)detail.IdQuestion!))
                    {
                        _dbContext.Remove(detail);
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

            }
            catch (System.Exception)
            {

                await transaction.RollbackAsync();
            }
        }

        public async Task UpdateQuestionsDetailsExaman(PutdelaitSectionExamanDto detailsExaman)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                List<int>? Quest = await _dbContext.Questions
                .Where(q => q.IdSection == detailsExaman.IdSection)
                .Select(x => x.IdQuestion)
                .ToListAsync();

                List<int?>? Detail = await _dbContext.DetailsExamen
                .Where(d => d.IdExaman == detailsExaman.IdExaman)
                .Select(Q => Q.IdQuestion)
                .ToListAsync();

                List<int>? DetailSection = new List<int>();

                foreach (var item in Detail)
                {
                    if (Quest.Contains((int)item!))
                    {
                        DetailSection.Add((int)item!);
                    }
                }

                foreach (var x in detailsExaman.QuestionEdited!)
                {
                    if (!DetailSection.Contains(x))
                    {
                        var newD = new DetailsExaman
                        {
                            IdExaman = detailsExaman.IdExaman,
                            IdQuestion = x
                        };
                        _dbContext.Add(newD);
                    }
                }
                foreach (var questionId in DetailSection)
                {
                    if (!detailsExaman.QuestionEdited.Contains(questionId))
                    {
                        var detailToRemove = await _dbContext.DetailsExamen
                            .Where(d => d.IdExaman == detailsExaman.IdExaman && d.IdQuestion == questionId)
                            .FirstOrDefaultAsync();
                        if (detailToRemove != null)
                        {
                            _dbContext.Remove(detailToRemove);
                        }
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

            }
            catch (System.Exception)
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task UpdateExamanWithQuestions(int idExaman, ExamanWithQuestionsDto detailsExaman)
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var examan = await _dbContext.Examen.FindAsync(idExaman);
                if (examan == null) return;

                // Update Examan basic info
                examan.Titre = detailsExaman.Titre;
                examan.Description = detailsExaman.Description;
                examan.Active = detailsExaman.Active;
                examan.Duration = detailsExaman.Duration;
                
                _dbContext.Examen.Update(examan);
                await _dbContext.SaveChangesAsync();

                // Update Questions (hard update: remove old, add new for simplicity if requested)
                // Or selectively update. Let's do hard update of DetailsExamen for this exam.
                var existingDetails = await _dbContext.DetailsExamen.Where(d => d.IdExaman == idExaman).ToListAsync();
                _dbContext.DetailsExamen.RemoveRange(existingDetails);

                if (detailsExaman.QuestionListId != null)
                {
                    foreach (var qId in detailsExaman.QuestionListId)
                    {
                        _dbContext.DetailsExamen.Add(new DetailsExaman
                        {
                            IdExaman = idExaman,
                            IdQuestion = (int)qId
                        });
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
