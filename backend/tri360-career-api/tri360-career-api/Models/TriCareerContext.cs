using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Quizback.Models;

public partial class TriCareerContext : DbContext
{
    
    public TriCareerContext(DbContextOptions<TriCareerContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AiResult> AiResults { get; set; }

    public virtual DbSet<Answer> Answers { get; set; }

    public virtual DbSet<Application> Applications { get; set; }

    public virtual DbSet<Candidate> Candidates { get; set; }

    public virtual DbSet<CandidateCV> CandidateCVs { get; set; }

    public virtual DbSet<Categorie> Categories { get; set; }

    public virtual DbSet<Department> Departments { get; set; }

    public virtual DbSet<Certificate> Certificates { get; set; }

    public virtual DbSet<Comment> Comments { get; set; }

    public virtual DbSet<Course> Courses { get; set; }

    public virtual DbSet<DetailsExaman> DetailsExamen { get; set; }

    public virtual DbSet<EmailConfirmation> EmailConfirmations { get; set; }

    public virtual DbSet<Examan> Examen { get; set; }

    public virtual DbSet<ExceptionDb> ExceptionDbs { get; set; }

    public virtual DbSet<Feedback> Feedbacks { get; set; }

    public virtual DbSet<HistoriqueApplication> HistoriqueApplications { get; set; }

    public virtual DbSet<Invoice> Invoices { get; set; }

    public virtual DbSet<JobPosting> JobPostings { get; set; }

    public virtual DbSet<EvaluationReport> EvaluationReports { get; set; }

    public virtual DbSet<Level> Levels { get; set; }

    public virtual DbSet<Note> Notes { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Offre> Offres { get; set; }

    public virtual DbSet<Participation> Participations { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<PaymentMethode> PaymentMethodes { get; set; }

    public virtual DbSet<Pipline> Piplines { get; set; }

    public virtual DbSet<Question> Questions { get; set; }

    public virtual DbSet<Reclaim> Reclaims { get; set; }

    public virtual DbSet<RecruitementProcess> RecruitementProcesses { get; set; }

    public virtual DbSet<ReponseDetail> ReponseDetails { get; set; }

    public virtual DbSet<ReponseValue> ReponseValues { get; set; }

    public virtual DbSet<Response> Responses { get; set; }

    public virtual DbSet<ResponseDetail> ResponseDetails { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Section> Sections { get; set; }

    public virtual DbSet<Session> Sessions { get; set; }

    public virtual DbSet<Stat> Stats { get; set; }

    public virtual DbSet<State> States { get; set; }

    public virtual DbSet<Status> Statuses { get; set; }

    public virtual DbSet<Suivi> Suivis { get; set; }

    public virtual DbSet<TblCustomer> TblCustomers { get; set; }

    public virtual DbSet<Test> Tests { get; set; }

    public virtual DbSet<Timeline> Timelines { get; set; }

    public virtual DbSet<TestChecklistResponse> TestChecklistResponses { get; set; }

    public virtual DbSet<User> Users { get; set; }

  

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AiResult>(entity =>
        {
            entity.HasKey(e => e.IdResultAi);

            entity.ToTable("AI_Result");

            entity.Property(e => e.IdResultAi).HasColumnName("Id_ResultAI");
            entity.Property(e => e.Result)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Application).WithMany(p => p.AiResults)
                .HasForeignKey(d => d.ApplicationId)
                .HasConstraintName("FK_AI_Result_Application");
        });

        modelBuilder.Entity<Answer>(entity =>
        {
            entity.Property(e => e.ClassName).IsUnicode(false);
            entity.Property(e => e.IdQuestion).HasColumnName("Id_Question");
            entity.Property(e => e.IsCorrect).HasColumnName("isCorrect");
            entity.Property(e => e.Key).IsUnicode(false);
            entity.Property(e => e.Label).IsUnicode(false);
            entity.Property(e => e.Name).IsUnicode(false);
            entity.Property(e => e.Type).IsUnicode(false);
            entity.Property(e => e.Value).IsUnicode(false);

            entity.HasOne(d => d.IdQuestionNavigation).WithMany(p => p.Answers)
                .HasForeignKey(d => d.IdQuestion)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_Answers_Question");
        });

        modelBuilder.Entity<Application>(entity =>
        {
            entity.ToTable("Application");

            entity.Property(e => e.ApplicationId).HasColumnName("ApplicationID");
            entity.Property(e => e.ApplicationDate).HasColumnType("datetime");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.JobPostingId).HasColumnName("JobPostingID");
            entity.Property(e => e.NameApplication)
                .HasMaxLength(255)
                .IsUnicode(false);

            entity.HasOne(d => d.IdStateNavigation).WithMany(p => p.Applications)
                .HasForeignKey(d => d.IdState)
                .HasConstraintName("FK_Application_State");

            entity.HasOne(d => d.JobPosting).WithMany(p => p.Applications)
                .HasForeignKey(d => d.JobPostingId)
                .HasConstraintName("FK_Application_JobPosting");

            entity.HasOne(d => d.User).WithMany(p => p.Applications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Application_Candidat");

            entity.HasOne(d => d.Candidate).WithMany(p => p.Applications)
                .HasForeignKey(d => d.CandidateId)
                .HasConstraintName("FK_Application_Candidate");

            entity.HasOne(d => d.CandidateCV).WithMany(p => p.Applications)
                .HasForeignKey(d => d.CVId)
                .HasConstraintName("FK_Application_CandidateCV");

            entity.Property(e => e.AssignedTeamLeaderId).HasColumnName("AssignedTeamLeaderId");

        });

        modelBuilder.Entity<Categorie>(entity =>
        {
            entity.ToTable("categorie");

            entity.Property(e => e.CategorieId).HasColumnName("CategorieID");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.Image).IsUnicode(false);
            entity.Property(e => e.IsActive).HasColumnName("isActive");
        });

        modelBuilder.Entity<Certificate>(entity =>
        {
            entity.ToTable("Certificate");

            entity.Property(e => e.CertificateId).HasColumnName("CertificateID");
            entity.Property(e => e.CertificateName).IsUnicode(false);
            entity.Property(e => e.CourseId).HasColumnName("CourseID");
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.Course).WithMany(p => p.Certificates)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_Certificate_Course");
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.Property(e => e.RecruitementProcessId).HasColumnName("RecruitementProcessID");
            entity.Property(e => e.Text).IsUnicode(false);

            entity.HasOne(d => d.RecruitementProcess).WithMany(p => p.Comments)
                .HasForeignKey(d => d.RecruitementProcessId)
                .HasConstraintName("FK_Comments_RecruitementProcess");
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("Course");

            entity.Property(e => e.CourseId).HasColumnName("CourseID");
            entity.Property(e => e.CategorieId).HasColumnName("CategorieID");
            entity.Property(e => e.Date).HasColumnType("date");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.Image)
                .IsUnicode(false)
                .HasColumnName("image");
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.IsFavorite).HasColumnName("isFavorite");
            entity.Property(e => e.LevelId).HasColumnName("LevelID");
            entity.Property(e => e.ReclaimId).HasColumnName("ReclaimID");
            entity.Property(e => e.Title).IsUnicode(false);

            entity.HasOne(d => d.Categorie).WithMany(p => p.Courses)
                .HasForeignKey(d => d.CategorieId)
                .HasConstraintName("FK_Course_Categorie");

            entity.HasOne(d => d.Reclaim).WithMany(p => p.Courses)
                .HasForeignKey(d => d.ReclaimId)
                .HasConstraintName("FK_Course_Claim");
        });

        modelBuilder.Entity<DetailsExaman>(entity =>
        {
            entity.HasKey(e => e.IdDetailExaman);

            entity.ToTable("Details_Examan");

            entity.Property(e => e.IdDetailExaman).HasColumnName("Id_Detail_Examan");
            entity.Property(e => e.IdExaman).HasColumnName("Id_Examan");
            entity.Property(e => e.IdQuestion).HasColumnName("Id_Question");

            entity.HasOne(d => d.IdExamanNavigation).WithMany(p => p.DetailsExamen)
                .HasForeignKey(d => d.IdExaman)
                .HasConstraintName("FK_Details_Examan_Examan");

            entity.HasOne(d => d.IdQuestionNavigation).WithMany(p => p.DetailsExamen)
                .HasForeignKey(d => d.IdQuestion)
                .HasConstraintName("FK_Details_Examan_Details_Question");
        });

        modelBuilder.Entity<EmailConfirmation>(entity =>
        {
            entity.HasKey(e => e.ConfirmationId);

            entity.ToTable("EmailConfirmation");

            entity.Property(e => e.ConfirmationId).HasColumnName("ConfirmationID");
            entity.Property(e => e.ConfirmationToken).IsUnicode(false);
            entity.Property(e => e.PaymentId).HasColumnName("PaymentID");
            entity.Property(e => e.SentDate).HasColumnType("date");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.Payment).WithMany(p => p.EmailConfirmations)
                .HasForeignKey(d => d.PaymentId)
                .HasConstraintName("FK_EmailConfirmation_Payment");
        });

        modelBuilder.Entity<Examan>(entity =>
        {
            entity.HasKey(e => e.IdExaman);

            entity.ToTable("Examan");

            entity.Property(e => e.IdExaman).HasColumnName("Id_Examan");
            entity.Property(e => e.Active).HasColumnName("active");
            entity.Property(e => e.DateCreation).HasColumnType("datetime");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.Titre).IsUnicode(false);
            entity.Property(e => e.UserId).HasColumnName("User_id");

            entity.HasOne(d => d.User).WithMany(p => p.Examen)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Examan_user");
        });

        modelBuilder.Entity<ExceptionDb>(entity =>
        {
            entity.ToTable("ExceptionDb");

            entity.Property(e => e.CreateDate).HasColumnType("datetime");
            entity.Property(e => e.Data).IsUnicode(false);
            entity.Property(e => e.FunctionName).IsUnicode(false);
            entity.Property(e => e.Hresult)
                .IsUnicode(false)
                .HasColumnName("HResult");
            entity.Property(e => e.InPlaintext).IsUnicode(false);
            entity.Property(e => e.Message).IsUnicode(false);
            entity.Property(e => e.NameService).IsUnicode(false);
            entity.Property(e => e.Stacktrace).IsUnicode(false);
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.ToTable("Feedback");

            entity.Property(e => e.FeedBackId).HasColumnName("FeedBackID");
            entity.Property(e => e.CourseId).HasColumnName("CourseID");
            entity.Property(e => e.FeedBackText).IsUnicode(false);
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.Course).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_Feedback_Course");
        });

        modelBuilder.Entity<HistoriqueApplication>(entity =>
        {
            entity.HasKey(e => e.IdHistorique);

            entity.ToTable("Historique_Application");

            entity.Property(e => e.DateHist).HasColumnType("date");
            entity.Property(e => e.JobPosting).IsUnicode(false);

            entity.HasOne(d => d.IdApplicationNavigation).WithMany(p => p.HistoriqueApplications)
                .HasForeignKey(d => d.IdApplication)
                .HasConstraintName("FK_Historique_Application_Application");

            entity.HasOne(d => d.IdStateNavigation).WithMany(p => p.HistoriqueApplications)
                .HasForeignKey(d => d.IdState)
                .HasConstraintName("FK_Historique_Application_State");
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoice");

            entity.Property(e => e.InvoiceId).HasColumnName("InvoiceID");
            entity.Property(e => e.InvoiceDate).HasColumnType("date");
            entity.Property(e => e.PaymentStatus).IsUnicode(false);
            entity.Property(e => e.TotaleAmount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.UserId).HasColumnName("UserID");
        });

        modelBuilder.Entity<JobPosting>(entity =>
        {
            entity.ToTable("JobPosting");

            entity.Property(e => e.JobPostingId).HasColumnName("JobPostingID");
            entity.Property(e => e.ApplicationDeadline).HasColumnType("datetime");
            entity.Property(e => e.DatePosted).HasColumnType("datetime");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.Location)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.PositionTitle)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Requirements).IsUnicode(false);
            entity.Property(e => e.Missions).IsUnicode(false);
            entity.Property(e => e.Skills).IsUnicode(false);
            entity.Property(e => e.Experience).IsUnicode(false);
        });

        modelBuilder.Entity<Level>(entity =>
        {
            entity.ToTable("Level");

            entity.Property(e => e.Description).IsUnicode(false);
        });

        modelBuilder.Entity<Note>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("Note");

            entity.Property(e => e.DescriptionNote)
                .IsUnicode(false)
                .HasColumnName("Description_Note");
            entity.Property(e => e.IdNote)
                .ValueGeneratedOnAdd()
                .HasColumnName("Id_note");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(e => e.Message).IsUnicode(false);
            entity.Property(e => e.Timestamp).HasColumnType("datetime");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Notifications_user");
        });

        modelBuilder.Entity<Offre>(entity =>
        {
            entity.HasKey(e => e.IdOffre);

            entity.Property(e => e.IdOffre).HasColumnName("Id_offre");
            entity.Property(e => e.Description)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.NameOffre)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("Name_offre");
            entity.Property(e => e.NbreVacancy).HasColumnName("Nbre_vacancy");
        });

        modelBuilder.Entity<Participation>(entity =>
        {
            entity.ToTable("Participation");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CourseId).HasColumnName("CourseID");
            entity.Property(e => e.Date).HasColumnType("date");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.Course).WithMany(p => p.Participations)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_Participation_Course");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payment");

            entity.Property(e => e.PaymentId).HasColumnName("PaymentID");
            entity.Property(e => e.Amount).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.InvoiceId).HasColumnName("InvoiceID");
            entity.Property(e => e.PaymentDate).HasColumnType("date");
            entity.Property(e => e.PaymentMethodeId).HasColumnName("PaymentMethodeID");

            entity.HasOne(d => d.Invoice).WithMany(p => p.Payments)
                .HasForeignKey(d => d.InvoiceId)
                .HasConstraintName("FK_Payment_Invoice");

            entity.HasOne(d => d.PaymentMethode).WithMany(p => p.Payments)
                .HasForeignKey(d => d.PaymentMethodeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payment_PaymentMethode");
        });

        modelBuilder.Entity<PaymentMethode>(entity =>
        {
            entity.ToTable("PaymentMethode");

            entity.Property(e => e.PaymentMethodeId).HasColumnName("PaymentMethodeID");
            entity.Property(e => e.PaymentMehodeName).IsUnicode(false);
        });

        modelBuilder.Entity<Pipline>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_Position");

            entity.ToTable("Pipline");

            entity.Property(e => e.NamePipline)
                .HasMaxLength(250)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.IdQuestion);

            entity.ToTable("Question");

            entity.Property(e => e.IdQuestion).HasColumnName("Id_Question");
            entity.Property(e => e.Active).HasColumnName("active");
            entity.Property(e => e.Barem).IsUnicode(false);
            entity.Property(e => e.Durée).IsUnicode(false);
            entity.Property(e => e.IdLevel).HasColumnName("Id_level");
            entity.Property(e => e.IdSection).HasColumnName("Id_Section");
            entity.Property(e => e.NameQuestion).IsUnicode(false);
            entity.Property(e => e.Score).IsUnicode(false);

            entity.HasOne(d => d.IdLevelNavigation).WithMany(p => p.Questions)
                .HasForeignKey(d => d.IdLevel)
                .HasConstraintName("FK_Question_Level");

            entity.HasOne(d => d.IdSectionNavigation).WithMany(p => p.Questions)
                .HasForeignKey(d => d.IdSection)
                .HasConstraintName("FK_Question_Section");
        });

        modelBuilder.Entity<Reclaim>(entity =>
        {
            entity.HasKey(e => e.ReclaimId).HasName("PK_Claim");

            entity.ToTable("Reclaim");

            entity.Property(e => e.ReclaimId).HasColumnName("ReclaimID");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.Tag).IsUnicode(false);
            entity.Property(e => e.Title).IsUnicode(false);
        });

        modelBuilder.Entity<RecruitementProcess>(entity =>
        {
            entity.ToTable("RecruitementProcess");

            entity.Property(e => e.RecruitementProcessId).HasColumnName("RecruitementProcessID");
            entity.Property(e => e.ApplicationId).HasColumnName("ApplicationID");
            entity.Property(e => e.DataEva)
                .HasColumnType("datetime")
                .HasColumnName("Data_Eva");
            entity.Property(e => e.DatePlanification).HasColumnType("datetime");
            entity.Property(e => e.Deadline)
                .HasColumnType("datetime")
                .HasColumnName("deadline");
            entity.Property(e => e.EvaCommentaire)
                .IsUnicode(false)
                .HasColumnName("Eva_Commentaire");
            entity.Property(e => e.EvaNote).HasColumnName("Eva_Note");
            entity.Property(e => e.IdStatus).HasColumnName("Id_Status");
            entity.Property(e => e.LastUpdateDate)
                .IsUnicode(false)
                .HasColumnName("lastUpdateDate");

            entity.Property(e => e.MeetLink)
                .IsUnicode(false)
                .HasColumnName("MeetLink");

            entity.Property(e => e.HostMeetLink)
                .IsUnicode(false)
                .HasColumnName("HostMeetLink");

            entity.Property(e => e.MeetingProvider)
                .IsUnicode(false)
                .HasColumnName("MeetingProvider");

            entity.Property(e => e.ExternalMeetingId)
                .IsUnicode(false)
                .HasColumnName("ExternalMeetingId");

            entity.HasOne(d => d.Application).WithMany(p => p.RecruitementProcesses)
                .HasForeignKey(d => d.ApplicationId)
                .HasConstraintName("FK_RecruitementProcess_Application");

            entity.HasOne(d => d.IdPositionNavigation).WithMany(p => p.RecruitementProcesses)
                .HasForeignKey(d => d.IdPosition)
                .HasConstraintName("FK_RecruitementProcess_Position1");

            entity.HasOne(d => d.IdStatusNavigation).WithMany(p => p.RecruitementProcesses)
                .HasForeignKey(d => d.IdStatus)
                .HasConstraintName("FK_RecruitementProcess_Status1");

            entity.HasOne(d => d.User).WithMany(p => p.RecruitementProcesses)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_RecruitementProcess_user");

            entity.Ignore(e => e.StepType);
            entity.Ignore(e => e.EmojiRating);
        });

        modelBuilder.Entity<ReponseDetail>(entity =>
        {
            entity.ToTable("ReponseDetail");

            entity.Property(e => e.Value)
                .IsUnicode(false)
                .HasColumnName("value");

            entity.HasOne(d => d.IdAnswersNavigation).WithMany(p => p.ReponseDetails)
                .HasForeignKey(d => d.IdAnswers)
                .HasConstraintName("FK_ReponseDetail_Answers");

            entity.HasOne(d => d.IdReponseValueNavigation).WithMany(p => p.ReponseDetails)
                .HasForeignKey(d => d.IdReponseValue)
                .HasConstraintName("FK_ReponseDetail_ReponseValue");
        });

        modelBuilder.Entity<ReponseValue>(entity =>
        {
            entity.HasKey(e => e.IdReponse);

            entity.ToTable("ReponseValue");

            entity.Property(e => e.IdReponse).HasColumnName("Id_Reponse");
            entity.Property(e => e.IdQuestion).HasColumnName("Id_Question");
            entity.Property(e => e.IdSession).HasColumnName("Id_Session");

            entity.HasOne(d => d.IdQuestionNavigation).WithMany(p => p.ReponseValues)
                .HasForeignKey(d => d.IdQuestion)
                .HasConstraintName("FK_ReponseValue_Question");

            entity.HasOne(d => d.IdSessionNavigation).WithMany(p => p.ReponseValues)
                .HasForeignKey(d => d.IdSession)
                .HasConstraintName("FK_ReponseValue_Session");
        });

        modelBuilder.Entity<Response>(entity =>
        {
            entity.ToTable("Response");

            entity.Property(e => e.ResponseId).HasColumnName("ResponseID");
            entity.Property(e => e.QuestionId).HasColumnName("QuestionID");
            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.Value).IsUnicode(false);
        });

        modelBuilder.Entity<ResponseDetail>(entity =>
        {
            entity.HasKey(e => e.ResponseDetailsId);

            entity.ToTable("Response_Details");

            entity.Property(e => e.ResponseDetailsId).HasColumnName("ResponseDetailsID");
            entity.Property(e => e.AnswerId).HasColumnName("AnswerID");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.ResponseId).HasColumnName("ResponseID");

            entity.HasOne(d => d.Response).WithMany(p => p.ResponseDetails)
                .HasForeignKey(d => d.ResponseId)
                .HasConstraintName("FK_Response_Details_Response");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Role");

            entity.Property(e => e.RoleId).HasColumnName("Role_Id");
            entity.Property(e => e.Description).IsUnicode(false);
        });

        modelBuilder.Entity<Section>(entity =>
        {
            entity.HasKey(e => e.IdSection);

            entity.ToTable("Section");

            entity.Property(e => e.IdSection).HasColumnName("Id_Section");
            entity.Property(e => e.Active).HasColumnName("active");
            entity.Property(e => e.Competance).IsUnicode(false);
            entity.Property(e => e.NameSection)
                .IsUnicode(false)
                .HasColumnName("Name_Section");
            entity.Property(e => e.UserId).HasColumnName("User_Id");

            entity.HasOne(d => d.User).WithMany(p => p.Sections)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Section_User");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("Session");

            entity.Property(e => e.CreatedAt).HasColumnType("date");
            entity.Property(e => e.EncryptedSessinId).IsUnicode(false);
            entity.Property(e => e.ExpiresAt).HasColumnType("date");
            entity.Property(e => e.RecruitementProcessId).HasColumnName("RecruitementProcessID");

            entity.HasOne(d => d.Examn).WithMany(p => p.Sessions)
                .HasForeignKey(d => d.ExamnId)
                .HasConstraintName("FK_Session_Examan");

            entity.HasOne(d => d.RecruitementProcess).WithMany(p => p.Sessions)
                .HasForeignKey(d => d.RecruitementProcessId)
                .HasConstraintName("FK_Session_RecruitementProcess");

            entity.Ignore(e => e.Score);
        });

        modelBuilder.Entity<Stat>(entity =>
        {
            entity.ToTable("Stat");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.StatName)
                .IsUnicode(false)
                .HasColumnName("statName");
        });

        modelBuilder.Entity<State>(entity =>
        {
            entity.HasKey(e => e.IdState);

            entity.ToTable("State");

            entity.Property(e => e.NameState).IsUnicode(false);
        });

        modelBuilder.Entity<Status>(entity =>
        {
            entity.HasKey(e => e.IdStatus);

            entity.ToTable("Status");

            entity.Property(e => e.IdStatus).HasColumnName("Id_Status");
            entity.Property(e => e.ColorS)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.NameStatus)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("Name_Status");
        });

        modelBuilder.Entity<Suivi>(entity =>
        {
            entity.HasKey(e => e.IdSuivi);

            entity.ToTable("Suivi");

            entity.Property(e => e.IdSuivi).HasColumnName("Id_Suivi");
            entity.Property(e => e.Date).HasColumnType("date");
            entity.Property(e => e.IdProcess).HasColumnName("Id_Process");
            entity.Property(e => e.IdStatus).HasColumnName("Id_Status");
            entity.Property(e => e.IdUserRq).HasColumnName("Id_user_rq");
            entity.Property(e => e.Remarque)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.UserId).HasColumnName("User_id");

            entity.HasOne(d => d.User).WithMany(p => p.Suivis)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_Suivi_User");
        });

        modelBuilder.Entity<TblCustomer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__TblCusto__3214EC07063E6B32");

            entity.ToTable("TblCustomer");

            entity.Property(e => e.Id).ValueGeneratedNever();
        });

        modelBuilder.Entity<Test>(entity =>
        {
            entity.ToTable("Test");

            entity.Property(e => e.TestId).HasColumnName("TestID");
            entity.Property(e => e.CourseId).HasColumnName("CourseID");
            entity.Property(e => e.Description).IsUnicode(false);
            entity.Property(e => e.IsActive).HasColumnName("isActive");
            entity.Property(e => e.Title).IsUnicode(false);

            entity.HasOne(d => d.Course).WithMany(p => p.Tests)
                .HasForeignKey(d => d.CourseId)
                .HasConstraintName("FK_Test_course");
        });

        modelBuilder.Entity<Timeline>(entity =>
        {
            entity.ToTable("Timeline");

            entity.Property(e => e.TimelineId).HasColumnName("TimelineID");
            entity.Property(e => e.Action)
                .IsUnicode(false)
                .HasColumnName("action");
            entity.Property(e => e.Date)
                .HasColumnType("datetime")
                .HasColumnName("date");
            entity.Property(e => e.RecruitementProcessId).HasColumnName("RecruitementProcessID");

            entity.HasOne(d => d.RecruitementProcess).WithMany(p => p.Timelines)
                .HasForeignKey(d => d.RecruitementProcessId)
                .HasConstraintName("FK_Timeline_RecruitementProcess");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("user");

            entity.Property(e => e.UserId).HasColumnName("User_Id");
            entity.Property(e => e.Adresse).IsUnicode(false);
            entity.Property(e => e.Email).IsUnicode(false);
            entity.Property(e => e.Name).IsUnicode(false);
            entity.Property(e => e.Password).IsUnicode(false);
            entity.Property(e => e.Prename).IsUnicode(false);
            entity.Property(e => e.RefreshToken).IsUnicode(false);
            entity.Property(e => e.RoleId).HasColumnName("Role_Id");
            entity.Property(e => e.Telephone).IsUnicode(false);
            entity.Property(e => e.Token).IsUnicode(false);
            entity.Property(e => e.TokenRdateCreation).HasColumnType("datetime");
            entity.Property(e => e.TokenRdateExpiration).HasColumnType("datetime");

            entity.HasOne(d => d.Department).WithMany(p => p.Users)
                .HasForeignKey(d => d.DepartmentId)
                .HasConstraintName("FK_User_Department");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_user_Role");
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("Department");
            entity.Property(e => e.DepartmentId).HasColumnName("DepartmentId");
            entity.Property(e => e.Name).HasMaxLength(255).IsUnicode(false);
        });

        modelBuilder.Entity<Candidate>(entity =>
        {
            entity.ToTable("Candidate");
            entity.Property(e => e.Email).HasMaxLength(255).IsUnicode(false);
            entity.Property(e => e.FirstName).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.LastName).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.Phone).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime").HasDefaultValueSql("(getdate())");
        });

        modelBuilder.Entity<CandidateCV>(entity =>
        {
            entity.HasKey(e => e.CVId);
            entity.ToTable("CandidateCV");
            entity.Property(e => e.CVPath).IsUnicode(false);
            entity.Property(e => e.UploadDate).HasColumnType("datetime").HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.Candidate).WithMany(p => p.CandidateCVs)
                .HasForeignKey(d => d.CandidateId)
                .HasConstraintName("FK_CandidateCV_Candidate");
        });

        // US20 : rapport d'évaluation IA
        modelBuilder.Entity<EvaluationReport>(entity =>
        {
            entity.ToTable("EvaluationReport");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
