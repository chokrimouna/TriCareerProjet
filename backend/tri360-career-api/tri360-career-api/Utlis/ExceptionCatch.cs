namespace QuizBack.utils

{
    public static class ExceptionCatch
    {
        public static void InsertDataException(string connectionString, ExceptionDb e)
        {
            try
            {
                string qs = @"INSERT INTO ExceptionDb(
                            [Message],
                            [Stacktrace],
                            [Data],
                            [Hresult],
                            [NameService],
                            [FunctionName],
                            [InPlaintext],
                            [CreateDate]) 
                        VALUES(@Message, @Stacktrace, @Data, @Hresult, @NameService, @FunctionName, @InPlaintext, @CreateDate)";

                CreateCommand(qs, connectionString, e);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ExceptionCatch] Could not log to DB: {ex.Message}");
            }
        }

        private static void CreateCommand(string queryString, string connectionString, ExceptionDb e)
        {
            using SqlConnection connection = new(connectionString);
            connection.Open();
            SqlCommand command = new(queryString, connection);
            command.Parameters.Add(new SqlParameter("@Message", e.Message));
            command.Parameters.Add(new SqlParameter("@Stacktrace", e.Stacktrace));
            command.Parameters.Add(new SqlParameter("@Data", e.Data));
            command.Parameters.Add(new SqlParameter("@Hresult", e.Hresult));
            command.Parameters.Add(new SqlParameter("@NameService", e.NameService));
            command.Parameters.Add(new SqlParameter("@FunctionName", e.FunctionName));
            command.Parameters.Add(new SqlParameter("@InPlaintext", e.InPlaintext));
            command.Parameters.Add(new SqlParameter("@CreateDate", e.CreateDate));
            command.ExecuteNonQuery();
            connection.Close();
        }

        public static ExceptionDb CreateNewInstanceForExceptionDb(Exception e, string nameService, string functionName)
        {
            ExceptionDb exceptionDb1 = new()
            {

                InPlaintext = ExceptionExtensions.InPlainText(e),
                Message = e.Message,
                Stacktrace = e.StackTrace!,
                Data = e.Data.ToString()!,
                Hresult = e.HResult.ToString(),
                NameService = nameService,
                FunctionName = functionName,
                CreateDate = DateTime.Now
                
            };
            return exceptionDb1;
        }
    }
}
