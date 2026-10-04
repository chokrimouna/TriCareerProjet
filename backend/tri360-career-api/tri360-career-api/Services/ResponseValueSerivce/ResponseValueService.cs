using QuizBack.Dto;

namespace Quizback.Services


{
    public class ResponseValueService : IResponseValueService
    {
        private readonly TriCareerContext _quizDbContext;
        private readonly string _connectionString;

        public ResponseValueService(TriCareerContext context, IConfiguration configuration)
        {
            _quizDbContext = context;
            _connectionString = configuration.GetConnectionString("ConnectionString")!;
        }

        public async Task<List<ReponseValue>?> GetReponseValues()
        {
            try
            {
                List<ReponseValue>? responseValues = await _quizDbContext.ReponseValues.ToListAsync();

                if (responseValues.Count == 0)
                    return responseValues;
                else
                    return responseValues;
            }
            catch (Exception e)
            {
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ResponseValueService", "GetReponseValues");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        //public async Task<List<ReponseValue?>> GetReponseValueByID(int Id)
        //{

        //    try
        //    {
        //        List<ReponseValue>? responseValue = await _quizDbContext.ReponseValues
        //        .Where(r => r.ApplicationId == Id)
        //        .Select(r => new ReponseValue()
        //        {
        //            IdReponse = r.IdReponse,
        //            IdQuestion = r.IdQuestion,
        //            ApplicationId = r.ApplicationId,
        //            TimeReponse = r.TimeReponse,
        //            IdQuestionNavigation = r.IdQuestionNavigation != null ? new Question()
        //            {
        //                IdQuestion = r.IdQuestionNavigation.IdQuestion,
        //                NameQuestion = r.IdQuestionNavigation.NameQuestion,
        //                Durée = r.IdQuestionNavigation.Durée,
        //                Score = r.IdQuestionNavigation.Score,
        //                Answers = r.IdQuestionNavigation.Answers.Select(a => new Answer()
        //                {
        //                    Id = a.Id,
        //                    Label = a.Label,
        //                    Type = a.Type,
        //                    IsCorrect = a.IsCorrect,
        //                    IdQuestion = a.IdQuestion
        //                }).ToList()
        //            } : null,
        //            ReponseDetails = r.ReponseDetails.Select(d => new ReponseDetail()
        //            {
        //                Id = d.Id,
        //                IdAnswers = d.IdAnswers,
        //                IdReponseValue = d.IdReponseValue,
        //                Value = d.Value
        //            }).ToList()
        //        })
        //        .ToListAsync();

        //        if (responseValue == null)
        //            return null;
        //        else
        //            return responseValue;
        //    }
        //    catch (Exception e)
        //    {
        //        ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ResponseValueService", "GetReponseValueByID");
        //        ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
        //        return null;
        //    }
        //}


        public async Task<ResponseValueDto?> AddResponseValue(ResponseValueDto responseValue)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (responseValue == null)
                    return (null);

                Console.WriteLine($"[AddResponseValue] Received submission for SessionId: {responseValue.ResponseValuedata?.IdSession}, QuestionId: {responseValue.ResponseValuedata?.IdQuestion}");
                
                if (responseValue.ResponseValuedata == null) return null;

                var ResponseValuedataobj = new ReponseValue
                {
                    IdQuestion = responseValue.ResponseValuedata.IdQuestion,               
                    TimeReponse = responseValue.ResponseValuedata.TimeReponse,
                    Answered = responseValue.ResponseValuedata.Answered,
                    IdSession = responseValue.ResponseValuedata.IdSession,

                };


                await _quizDbContext.ReponseValues.AddAsync(ResponseValuedataobj);
                await _quizDbContext.SaveChangesAsync();

                if (responseValue.ResponseDetaildata != null)
                {
                    foreach (var item in responseValue.ResponseDetaildata)
                    {
                        var ResponseDetaildataobj = new ReponseDetail
                        {
                            IdAnswers = item!.IdAnswers,

                            IdReponseValue = ResponseValuedataobj.IdReponse,

                            Value = item.Value
                        };

                        _quizDbContext.ReponseDetails.Add(ResponseDetaildataobj);
                    }
                }

                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return responseValue;
            }
            catch (Exception e)
            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ResponseValueService", "AddResponseValue");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null;
            }
        }

        public async Task<RetourMessage?> DeleteResponseValue(int Id)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                ReponseValue? responseValue = await _quizDbContext.ReponseValues.FindAsync(Id);
                if (responseValue == null)
                    return new RetourMessage("La valeur de réponse n'existe pas", false, null!);

                _quizDbContext.ReponseValues.Remove(responseValue);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return new RetourMessage("Valeur de réponse supprimée avec succès", true, null!);
            }

            catch (Exception e)

            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ResponseValueService", "DeleteResponseValue");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return new RetourMessage("Erreur lors de la suppression de la valeur de réponse", false, exceptionDb);
            }
        }

        public async Task<ReponseValue?> UpdateReponseValue(ReponseValue responseValue)
        {
            await using IDbContextTransaction transaction = await _quizDbContext.Database.BeginTransactionAsync();
            try
            {
                if (responseValue == null)
                    return null!;
                _quizDbContext.ReponseValues.Update(responseValue);
                await _quizDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return responseValue;
            }

            catch (Exception e)

            {
                await transaction.RollbackAsync();
                ExceptionDb exceptionDb = ExceptionCatch.CreateNewInstanceForExceptionDb(e, "ResponseValueService", "UpdateReponseValue");
                ExceptionCatch.InsertDataException(_connectionString, exceptionDb);
                return null!;
            }
        }



      
    }
}
















