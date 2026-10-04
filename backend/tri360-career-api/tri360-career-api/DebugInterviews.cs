using System;
using Microsoft.Data.SqlClient;

public static class DebugInterviews
{
    public static void Run()
    {
        string connectionString = "Server=localhost,15433;Database=TriCareerDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True";

        using (SqlConnection connection = new SqlConnection(connectionString))
        {
            connection.Open();
            string sql = @"
                SELECT TOP 5 
                    rp.RecruitementProcessId, 
                    a.NameApplication, 
                    a.Email as CandidateEmail, 
                    u.Email as HostEmail,
                    rp.MeetLink, 
                    rp.HostMeetLink,
                    rp.DatePlanification
                FROM RecruitementProcess rp
                JOIN Application a ON rp.ApplicationId = a.ApplicationID
                LEFT JOIN [user] u ON rp.UserId = u.User_Id
                WHERE a.Email = 'amenygharbi2001@gmail.com'
                   OR u.Email = 'ameny.triweb@gmal.com'
                ORDER BY rp.DatePlanification DESC;";

            using (SqlCommand command = new SqlCommand(sql, connection))
            {
                using (SqlDataReader reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        Console.WriteLine($"ID: {reader["RecruitementProcessId"]}");
                        Console.WriteLine($"App: {reader["NameApplication"]}");
                        Console.WriteLine($"Candidate: {reader["CandidateEmail"]}");
                        Console.WriteLine($"Host: {reader["HostEmail"]}");
                        Console.WriteLine($"MeetLink: {reader["MeetLink"]}");
                        Console.WriteLine($"HostMeetLink: {reader["HostMeetLink"]}");
                        Console.WriteLine($"Date: {reader["DatePlanification"]}");
                        Console.WriteLine("-----------------------------------");
                    }
                }
            }
        }
    }
}
