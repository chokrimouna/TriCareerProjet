using QuizBack.Dto;

namespace Quizback.Services


{
    public interface IResponseValueService
    {
        Task<List<ReponseValue>?> GetReponseValues();
        //Task<List<ReponseValue?>> GetReponseValueByID(int Id);
        Task<ResponseValueDto?> AddResponseValue(ResponseValueDto responseValue);
        Task<RetourMessage?> DeleteResponseValue(int Id);
        Task<ReponseValue?> UpdateReponseValue(ReponseValue ReponseValue);

        //Task<ReponseValue> GetReponseValueByIdQuestionApplicationId(int? Idq, int? Ida);

    }
}


