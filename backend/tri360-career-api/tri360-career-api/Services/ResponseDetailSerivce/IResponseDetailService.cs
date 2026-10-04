namespace Quizback.Services


{
    public interface IResponseDetailService
    {
        Task<List<ReponseDetail>?> GetReponseDetail();
        Task<ReponseDetail?> GetReponseDetailByID(int Id);
        Task<ReponseDetail?> AddReponseDetail(ReponseDetail ReponseDetail);
        Task<RetourMessage?> DeleteReponseDetail(int Id);
        Task<ReponseDetail?> UpdateReponseDetail(ReponseDetail ReponseDetail);
    }
}


