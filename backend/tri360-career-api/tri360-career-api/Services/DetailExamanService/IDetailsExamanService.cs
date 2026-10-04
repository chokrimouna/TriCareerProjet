using QuizBack.Dto;

namespace Quizback.Services
{
    public interface IDetailsExamanService
    {
        Task<List<DetailsExaman>?> GetAllDetailsExaman();
        Task<DetailsExaman?> GetDetailsExamanById(int detailsExamanId);
        Task AddDetailsExaman(DetailsExaman detailsExaman);
        Task<Examan?> AddExamanWithQuestions(ExamanWithQuestionsDto detailsExaman);
        Task UpdateDetailsExaman(DetailsExaman detailsExaman);
        Task UpdateQuestionsDetailsExaman(PutdelaitSectionExamanDto detailsExaman);
        Task DeleteDetailsExaman(int detailsExamanId);
        Task DeleteQuestionFromDetailEx(DetaildelaitDto detaildata);
        Task DeleteSectionFromDetailEx(DeletedelaitSectionExamanDto detaildata);
        Task<List<DetailsExaman>?> GetAllDetailsExamanByIdExamen(int IdExaman);
        Task AddDeleteDetailsExaman(List<DetailsExaman>? detailsExaman); 
        Task UpdateExamanWithQuestions(int idExaman, ExamanWithQuestionsDto detailsExaman);
    }
}
