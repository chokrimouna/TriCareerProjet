namespace Quizback.Services
{
    public interface ISectionService
    {
        Task<List<Section>?> GetAllSections();
        Task<Section?> GetSectionById(int sectionId);
        Task<Section?> AddSection(Section section);
        Task UpdateSection(Section section);
        Task SectionDisactivated(int sectionId);
        Task SectionActivated(int sectionId);
        Task DeleteSection(int sectionId);

        Task<List<Section>?> GetSectionByIdExaman(int ExamanId);
        Task<List<Section>?> GetSectionDisponibleByIdExaman(int ExamanId);




    }
}
