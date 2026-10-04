using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public class QuestionService : IQuestionService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public QuestionService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<Question>?> GetAllQuestions()
        {
            try
            {
                List<Question> questions = await _dbContext.Questions.Where(q => q.Active == true)
                    .Include(s => s.DetailsExamen)
                    .Include(s => s.ReponseValues)
                    .Include(s => s.Answers)
                    .Include(s => s.IdLevelNavigation)
                    .ToListAsync();

                return questions;
            }
            catch
            {
                return null;
            }
        }


        public async Task<Question?> GetQuestionById(int questionId)
        {
            try
            {
                Question? Quest = await _dbContext.Questions
                    .Include(A => A.Answers)
                    .FirstOrDefaultAsync(q => q.IdQuestion == questionId);

                return Quest;
            }
            catch
            {
                return null;
            }
        }

        public async Task AddQuestion(Question question)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                _dbContext.Questions.Add(question);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task<Question?> AddQuestionWithAnswers(QuestionsAnswers questionsAnswers)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (questionsAnswers == null) return null;

                var question = new Question
                {
                    Active = true,
                    NameQuestion = questionsAnswers.Question?.NameQuestion,
                    Durée = questionsAnswers.Question?.Durée,
                    Score = questionsAnswers.Question?.Score,
                    IdSection = questionsAnswers.Question?.IdSection,
                    IdLevel = questionsAnswers.Question?.IdLevel
                };

                _dbContext.Add(question);
                await _dbContext.SaveChangesAsync();

                if (questionsAnswers.Answers != null)
                {
                    foreach (var item in questionsAnswers.Answers)
                    {
                        var answer = new Answer
                        {
                            IsCorrect = item.IsCorrect,
                            Label = item.Label,
                            Name = item.Name,
                            Type = item.Type,
                            IdQuestion = question.IdQuestion
                        };

                        _dbContext.Add(answer);
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return question;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in AddQuestionWithAnswers: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                await transaction.RollbackAsync();
                return null;
            }
        }

        public async Task UpdateQuestion(Question question)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                _dbContext.Questions.Update(question);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task DeleteQuestion(int questionId)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var question = await _dbContext.Questions.FindAsync(questionId);
                if (question != null)
                {
                    _dbContext.Questions.Remove(question);
                    await _dbContext.SaveChangesAsync();
                }
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task QuestionDisactivated(int questionId)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var question = await _dbContext.Questions.FindAsync(questionId);
                if (question != null)
                {
                    question.Active = false;
                    _dbContext.Questions.Update(question);
                    await _dbContext.SaveChangesAsync();
                }
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task QuestionActivated(int questionId)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                var question = await _dbContext.Questions.FindAsync(questionId);
                if (question != null)
                {
                    question.Active = true;
                    _dbContext.Questions.Update(question);
                    await _dbContext.SaveChangesAsync();
                }
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
            }
        }

        public async Task<List<Question>?> GetQuestionByIdSection(int idSection)
        {
            try
            {
                return await _dbContext.Questions.Where(q => q.Active == true && q.IdSection == idSection)
                    .Include(s => s.Answers)
                    .Include(x => x.IdLevelNavigation)

                    .ToListAsync();
            }
            catch
            {
                return null;
            }
        }

        public async Task<Question?> EditQuestionwithAnswers(QuestionsAnswersEdit questionsAnswers)
        {
            await using var transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (questionsAnswers == null || questionsAnswers.Question == null) return null;

                var questionId = questionsAnswers.Question?.idQuestion ?? 0;
                Console.WriteLine($"[EditQuestionwithAnswers] Upserting Question ID: {questionId}");

                var existingQuestion = await _dbContext.Questions
                    .Include(q => q.Answers)
                    .FirstOrDefaultAsync(q => q.IdQuestion == questionId);

                if (existingQuestion == null)
                {
                    Console.WriteLine($"[EditQuestionwithAnswers] Question ID {questionId} NOT FOUND. Creating a NEW question instead.");
                    existingQuestion = new Question();
                    _dbContext.Questions.Add(existingQuestion);
                }

                Console.WriteLine($"[EditQuestionwithAnswers] Updating fields for Question ID: {existingQuestion.IdQuestion}");

                // Update Question fields
                existingQuestion.NameQuestion = questionsAnswers.Question?.NameQuestion ?? existingQuestion.NameQuestion;
                existingQuestion.Durée = questionsAnswers.Question?.Durée ?? existingQuestion.Durée;
                existingQuestion.Score = questionsAnswers.Question?.Score ?? existingQuestion.Score;
                existingQuestion.Barem = questionsAnswers.Question?.Score ?? existingQuestion.Barem;
                existingQuestion.IdSection = questionsAnswers.Question?.IdSection ?? existingQuestion.IdSection;
                existingQuestion.IdLevel = questionsAnswers.Question?.IdLevel ?? existingQuestion.IdLevel;
                existingQuestion.Active = questionsAnswers.Question?.Active ?? existingQuestion.Active;

                if (questionsAnswers.Answers != null)
                {
                    var incomingAnswerIds = questionsAnswers.Answers
                        .Where(a => a.Id.HasValue && a.Id.Value > 0)
                        .Select(a => a.Id.Value)
                        .ToList();

                    // 1. Identify and remove answers that are no longer in the request
                    var answersToRemove = existingQuestion.Answers
                        .Where(a => !incomingAnswerIds.Contains(a.Id))
                        .ToList();

                    foreach (var answerToRemove in answersToRemove)
                    {
                        // Check if the answer is referenced in ReponseDetail to avoid FK errors
                        var isReferenced = await _dbContext.ReponseDetails.AnyAsync(rd => rd.IdAnswers == answerToRemove.Id);
                        if (!isReferenced)
                        {
                            _dbContext.Answers.Remove(answerToRemove);
                        }
                        else
                        {
                            // If referenced, we can't delete it. 
                            // We might want to mark it as inactive if the model supports it, 
                            // or just skip deletion to avoid the crash.
                            Console.WriteLine($"Warning: Cannot delete Answer ID {answerToRemove.Id} because it is referenced in ReponseDetail.");
                        }
                    }

                    // 2. Update existing answers or add new ones
                    foreach (var item in questionsAnswers.Answers)
                    {
                        if (item.Id.HasValue && item.Id.Value > 0)
                        {
                            var existingAnswer = existingQuestion.Answers.FirstOrDefault(a => a.Id == item.Id.Value);
                            if (existingAnswer != null)
                            {
                                existingAnswer.IsCorrect = item.IsCorrect;
                                existingAnswer.Label = item.Label;
                                existingAnswer.Type = item.Type;
                                existingAnswer.Name = item.Type == "radio" ? "radio" : "";
                            }
                        }
                        else
                        {
                            var newanswer = new Answer
                            {
                                IsCorrect = item.IsCorrect,
                                Label = item.Label,
                                Type = item.Type,
                                Name = item.Type == "radio" ? "radio" : "",
                                IdQuestion = questionId
                            };
                            _dbContext.Answers.Add(newanswer);
                        }
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return existingQuestion;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in EditQuestionwithAnswers: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"Inner: {ex.InnerException.Message}");
                await transaction.RollbackAsync();
                return null;
            }
        }
    }
}
