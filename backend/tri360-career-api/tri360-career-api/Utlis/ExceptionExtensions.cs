namespace QuizBack.utils


{
    public static class ExceptionExtensions
    {
        public static string InPlainText(this Exception exception)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("Exception ");
            sb.AppendLine(inPlainText(exception));
            sb.AppendFormat("Stack :{0}", exception.StackTrace);
            sb.AppendLine();
            return sb.ToString();
        }

        /// <summary>
        /// Methode récursive pour "empiler" les InnerExceptions.
        /// </summary>
        /// <param name="exception"></param>
        /// <returns></returns>
        private static string inPlainText(Exception exception)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine(exception.GetType().Name);
            sb.AppendFormat("Message {0}", exception.Message);
            sb.AppendLine();
            if (string.IsNullOrEmpty(exception.Source) == false)
            {
                sb.AppendFormat("Source {0}", exception.Source);
                sb.AppendLine();
            }
            if (exception.InnerException != null)
            {
                sb.AppendLine("InnerException");
                sb.AppendLine(inPlainText(exception.InnerException));
            }
            return sb.ToString();

        }
    }
}