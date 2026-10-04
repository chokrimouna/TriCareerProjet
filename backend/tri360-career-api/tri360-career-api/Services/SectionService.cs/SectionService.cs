using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Quizback.Services
{
    public class SectionService : ISectionService
    {
        private readonly TriCareerContext _dbContext;
        private readonly string _connectionString;

        public SectionService(TriCareerContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<Section>?> GetAllSections()
        {
            try
            {
                List<Section> sections = await _dbContext.Sections.Where(s => s.Active == true)
                    .Include(s => s.Questions.Where(s => s.Active == true)).ThenInclude(s => s.DetailsExamen)
                    .Include(s => s.Questions.Where(s => s.Active == true)).ThenInclude(s => s.Answers)
                    .ToListAsync();

                return sections;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "GetAllSections");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<Section?> GetSectionById(int sectionId)
        {
            try
            {
                Section? section = await _dbContext.Sections
                    .Include(Q => Q.Questions)
                    .FirstOrDefaultAsync(s => s.IdSection == sectionId);

                return section;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "GetSectionById");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<Section?> AddSection(Section section)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (section == null)
                    throw new ArgumentNullException(nameof(section), "Section cannot be null");

                _dbContext.Sections.Add(section);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return section;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "AddSection");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task UpdateSection(Section section)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (section == null)
                    throw new ArgumentNullException(nameof(section), "Section cannot be null");

                _dbContext.Sections.Update(section);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "UpdateSection");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task DeleteSection(int sectionId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                Section? section = await _dbContext.Sections.FindAsync(sectionId);
                if (section == null)
                    throw new ArgumentException("Section not found", nameof(sectionId));

                _dbContext.Sections.Remove(section);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "DeleteSection");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<List<Section>?> GetSectionByIdExaman(int ExamanId)
        {
            try
            {
                List<int?> lIdq = await _dbContext.DetailsExamen.Where(x => x.IdExaman == ExamanId)
                                    .Select(x => x.IdQuestion).ToListAsync();
                List<int?> lIds = await _dbContext.Questions.Where(x => lIdq.Contains(x.IdQuestion) && x.Active == true)
                                    .Select(x => x.IdSection).ToListAsync();

                List<Section> section = await _dbContext.Sections.Where(x => lIds.Contains(x.IdSection) && x.Active == true)
                    .Include(Q => Q.Questions.Where(x => lIdq.Contains(x.IdQuestion) && x.Active == true))
                    .ThenInclude(Q => Q.Answers)
                    .ToListAsync();

                return section;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "GetSectionByIdExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task<List<Section>?> GetSectionDisponibleByIdExaman(int ExamanId)
        {
            try
            {
                List<int?> lIdq = await _dbContext.DetailsExamen.Where(x => x.IdExaman == ExamanId)
                                    .Select(x => x.IdQuestion).ToListAsync();
                List<int?> lIds = await _dbContext.Questions.Where(x => lIdq.Contains(x.IdQuestion))
                                    .Select(x => x.IdSection).ToListAsync();

                List<Section> section = await _dbContext.Sections.Where(x => !lIds.Contains(x.IdSection) && x.Active == true)
                                    .Include(x => x.Questions)
                                    .ToListAsync();

                return section;
            }
            catch (Exception ex)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "GetSectionDisponibleByIdExaman");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task SectionDisactivated(int sectionId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (sectionId == 0)
                    throw new ArgumentException("SectionId cannot be 0", nameof(sectionId));

                Section? section = await _dbContext.Sections.FindAsync(sectionId);
                if (section == null)
                    throw new ArgumentException("Section not found", nameof(sectionId));
                List<Question>? Ques = await _dbContext.Questions
                .Where(Q => Q.IdSection == sectionId)
                .ToListAsync();

                foreach (var item in Ques)
                {
                    item.Active = false;
                    _dbContext.Questions.Update(item);
                }

                section.Active = false;
                _dbContext.Sections.Update(section);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "SectionDisactivated");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

        public async Task SectionActivated(int sectionId)
        {
            await using IDbContextTransaction transaction = _dbContext.Database.BeginTransaction();
            try
            {
                if (sectionId == 0)
                    throw new ArgumentException("SectionId cannot be 0", nameof(sectionId));

                Section? section = await _dbContext.Sections.FindAsync(sectionId);
                if (section == null)
                    throw new ArgumentException("Section not found", nameof(sectionId));

                section.Active = true;
                _dbContext.Sections.Update(section);
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(ex, "SectionService", "SectionActivated");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                // Gérer l'exception selon vos besoins
                throw; // Vous pouvez choisir de relancer l'exception ici ou de la gérer différemment
            }
        }

    }
}
