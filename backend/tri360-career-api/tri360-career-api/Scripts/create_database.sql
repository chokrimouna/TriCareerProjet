IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TriCareerDb')
BEGIN
    CREATE DATABASE TriCareerDb;
END
GO

USE TriCareerDb;
GO

IF OBJECT_ID('dbo.Role', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Role
    (
        Role_Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Description VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.Level', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Level
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Description VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.State', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.State
    (
        IdState INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        NameState VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.Status', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Status
    (
        Id_Status INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name_Status VARCHAR(50) NULL,
        ColorS VARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID('dbo.Pipline', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pipline
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        NamePipline VARCHAR(250) NULL,
        Active BIT NULL
    );
END
GO

IF OBJECT_ID('dbo.Reclaim', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reclaim
    (
        ReclaimID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Title VARCHAR(MAX) NULL,
        Description VARCHAR(MAX) NULL,
        Tag VARCHAR(MAX) NULL,
        isActive BIT NULL
    );
END
GO

IF OBJECT_ID('dbo.PaymentMethode', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentMethode
    (
        PaymentMethodeID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PaymentMehodeName VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.categorie', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.categorie
    (
        CategorieID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Description VARCHAR(MAX) NULL,
        Image VARCHAR(MAX) NULL,
        isActive BIT NULL
    );
END
GO

IF OBJECT_ID('dbo.JobPosting', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.JobPosting
    (
        JobPostingID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PositionTitle VARCHAR(50) NULL,
        Description VARCHAR(MAX) NULL,
        Requirements VARCHAR(50) NULL,
        Location VARCHAR(50) NULL,
        DatePosted DATETIME NULL,
        ApplicationDeadline DATETIME NULL
    );
END
GO

IF OBJECT_ID('dbo.TblCustomer', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TblCustomer
    (
        Id INT NOT NULL PRIMARY KEY,
        Name NVARCHAR(MAX) NULL,
        Email NVARCHAR(MAX) NULL,
        Phone NVARCHAR(MAX) NULL,
        CreditLimit INT NULL
    );
END
GO

IF OBJECT_ID('dbo.Stat', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Stat
    (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        statName VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.Offre', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Offre
    (
        Id_offre INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name_offre VARCHAR(50) NULL,
        Description VARCHAR(50) NULL,
        Nbre_vacancy INT NULL
    );
END
GO

IF OBJECT_ID('dbo.ExceptionDb', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExceptionDb
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Message VARCHAR(MAX) NULL,
        Stacktrace VARCHAR(MAX) NULL,
        Data VARCHAR(MAX) NULL,
        HResult VARCHAR(MAX) NULL,
        NameService VARCHAR(MAX) NULL,
        FunctionName VARCHAR(MAX) NULL,
        InPlaintext VARCHAR(MAX) NULL,
        CreateDate DATETIME NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.Note', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Note
    (
        Id_note INT IDENTITY(1,1) NOT NULL,
        Description_Note VARCHAR(MAX) NULL
    );
END
GO

IF OBJECT_ID('dbo.[user]', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.[user]
    (
        User_Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name VARCHAR(MAX) NULL,
        Prename VARCHAR(MAX) NULL,
        Email VARCHAR(MAX) NULL,
        Password VARCHAR(MAX) NULL,
        Telephone VARCHAR(MAX) NULL,
        Adresse VARCHAR(MAX) NULL,
        Role_Id INT NULL,
        RefreshToken VARCHAR(MAX) NULL,
        TokenRdateCreation DATETIME NULL,
        TokenRdateExpiration DATETIME NULL,
        Token VARCHAR(MAX) NULL,
        Etat BIT NULL,
        CONSTRAINT FK_user_Role FOREIGN KEY (Role_Id) REFERENCES dbo.Role(Role_Id)
    );
END
GO

IF OBJECT_ID('dbo.Section', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Section
    (
        Id_Section INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Name_Section VARCHAR(MAX) NULL,
        Competance VARCHAR(MAX) NULL,
        User_Id INT NULL,
        active BIT NULL,
        CONSTRAINT FK_Section_User FOREIGN KEY (User_Id) REFERENCES dbo.[user](User_Id)
    );
END
GO

IF OBJECT_ID('dbo.Course', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Course
    (
        CourseID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Title VARCHAR(MAX) NULL,
        Description VARCHAR(MAX) NULL,
        LevelID INT NULL,
        CategorieID INT NULL,
        image VARCHAR(MAX) NULL,
        isActive BIT NULL,
        ReclaimID INT NULL,
        Duration INT NULL,
        FormerId INT NULL,
        [Date] DATE NULL,
        isFavorite BIT NULL,
        CONSTRAINT FK_Course_Categorie FOREIGN KEY (CategorieID) REFERENCES dbo.categorie(CategorieID),
        CONSTRAINT FK_Course_Claim FOREIGN KEY (ReclaimID) REFERENCES dbo.Reclaim(ReclaimID)
    );
END
GO

IF OBJECT_ID('dbo.Question', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Question
    (
        Id_Question INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        NameQuestion VARCHAR(MAX) NULL,
        [Durée] VARCHAR(MAX) NULL,
        Barem VARCHAR(MAX) NULL,
        Id_Section INT NULL,
        Id_level INT NULL,
        active BIT NULL,
        TimeReponse INT NULL,
        Score VARCHAR(MAX) NULL,
        CONSTRAINT FK_Question_Level FOREIGN KEY (Id_level) REFERENCES dbo.Level(Id),
        CONSTRAINT FK_Question_Section FOREIGN KEY (Id_Section) REFERENCES dbo.Section(Id_Section)
    );
END
GO

IF OBJECT_ID('dbo.Examan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Examan
    (
        Id_Examan INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        User_id INT NULL,
        Description VARCHAR(MAX) NULL,
        Titre VARCHAR(MAX) NULL,
        active BIT NULL,
        DateCreation DATETIME NULL,
        CONSTRAINT FK_Examan_user FOREIGN KEY (User_id) REFERENCES dbo.[user](User_Id)
    );
END
GO

IF OBJECT_ID('dbo.Application', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Application
    (
        ApplicationID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        JobPostingID INT NULL,
        ApplicationDate DATETIME NULL,
        UserId INT NULL,
        IdState INT NULL,
        CvPath NVARCHAR(MAX) NULL,
        NameApplication VARCHAR(255) NULL,
        email NVARCHAR(MAX) NULL,
        PhoneNumber INT NULL,
        CONSTRAINT FK_Application_JobPosting FOREIGN KEY (JobPostingID) REFERENCES dbo.JobPosting(JobPostingID),
        CONSTRAINT FK_Application_State FOREIGN KEY (IdState) REFERENCES dbo.State(IdState),
        CONSTRAINT FK_Application_Candidat FOREIGN KEY (UserId) REFERENCES dbo.[user](User_Id)
    );
END
GO

IF OBJECT_ID('dbo.RecruitementProcess', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecruitementProcess
    (
        RecruitementProcessID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DatePlanification DATETIME NULL,
        ApplicationID INT NULL,
        UserId INT NULL,
        IdPosition INT NULL,
        Id_Status INT NULL,
        deadline DATETIME NULL,
        lastUpdateDate VARCHAR(MAX) NULL,
        Data_Eva DATETIME NULL,
        Eva_Note INT NULL,
        Eva_Commentaire VARCHAR(MAX) NULL,
        Final BIT NULL,
        CONSTRAINT FK_RecruitementProcess_Application FOREIGN KEY (ApplicationID) REFERENCES dbo.Application(ApplicationID),
        CONSTRAINT FK_RecruitementProcess_Position1 FOREIGN KEY (IdPosition) REFERENCES dbo.Pipline(Id),
        CONSTRAINT FK_RecruitementProcess_Status1 FOREIGN KEY (Id_Status) REFERENCES dbo.Status(Id_Status),
        CONSTRAINT FK_RecruitementProcess_user FOREIGN KEY (UserId) REFERENCES dbo.[user](User_Id)
    );
END
GO

IF OBJECT_ID('dbo.Session', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Session
    (
        SessionId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        EncryptedSessinId VARCHAR(MAX) NULL,
        CreatedAt DATE NULL,
        ExpiresAt DATE NOT NULL,
        ExamnId INT NULL,
        ApplicationId INT NULL,
        SessionState BIT NULL,
        RecruitementProcessID INT NULL,
        CONSTRAINT FK_Session_Examan FOREIGN KEY (ExamnId) REFERENCES dbo.Examan(Id_Examan),
        CONSTRAINT FK_Session_RecruitementProcess FOREIGN KEY (RecruitementProcessID) REFERENCES dbo.RecruitementProcess(RecruitementProcessID)
    );
END
GO

IF OBJECT_ID('dbo.Answers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Answers
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        EndIcon BIT NULL,
        Label VARCHAR(MAX) NULL,
        [Type] VARCHAR(MAX) NULL,
        [Name] VARCHAR(MAX) NULL,
        ClassName VARCHAR(MAX) NULL,
        [Key] VARCHAR(MAX) NULL,
        Value VARCHAR(MAX) NULL,
        Id_Question INT NULL,
        isCorrect INT NULL,
        CONSTRAINT FK_Answers_Question FOREIGN KEY (Id_Question) REFERENCES dbo.Question(Id_Question) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID('dbo.ReponseValue', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReponseValue
    (
        Id_Reponse INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Id_Question INT NULL,
        TimeReponse INT NULL,
        Answered BIT NULL,
        Id_Session INT NULL,
        CONSTRAINT FK_ReponseValue_Question FOREIGN KEY (Id_Question) REFERENCES dbo.Question(Id_Question),
        CONSTRAINT FK_ReponseValue_Session FOREIGN KEY (Id_Session) REFERENCES dbo.Session(SessionId)
    );
END
GO

IF OBJECT_ID('dbo.ReponseDetail', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReponseDetail
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdAnswers INT NULL,
        IdReponseValue INT NULL,
        value VARCHAR(MAX) NULL,
        CONSTRAINT FK_ReponseDetail_Answers FOREIGN KEY (IdAnswers) REFERENCES dbo.Answers(Id),
        CONSTRAINT FK_ReponseDetail_ReponseValue FOREIGN KEY (IdReponseValue) REFERENCES dbo.ReponseValue(Id_Reponse)
    );
END
GO

IF OBJECT_ID('dbo.Comments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Comments
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RecruitementProcessID INT NULL,
        [Text] VARCHAR(MAX) NULL,
        CONSTRAINT FK_Comments_RecruitementProcess FOREIGN KEY (RecruitementProcessID) REFERENCES dbo.RecruitementProcess(RecruitementProcessID)
    );
END
GO

IF OBJECT_ID('dbo.Timeline', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Timeline
    (
        TimelineID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RecruitementProcessID INT NULL,
        [date] DATETIME NULL,
        [action] VARCHAR(MAX) NULL,
        CONSTRAINT FK_Timeline_RecruitementProcess FOREIGN KEY (RecruitementProcessID) REFERENCES dbo.RecruitementProcess(RecruitementProcessID)
    );
END
GO

IF OBJECT_ID('dbo.Details_Examan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Details_Examan
    (
        Id_Detail_Examan INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Id_Examan INT NULL,
        Id_Question INT NULL,
        CONSTRAINT FK_Details_Examan_Examan FOREIGN KEY (Id_Examan) REFERENCES dbo.Examan(Id_Examan),
        CONSTRAINT FK_Details_Examan_Details_Question FOREIGN KEY (Id_Question) REFERENCES dbo.Question(Id_Question)
    );
END
GO

IF OBJECT_ID('dbo.AI_Result', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AI_Result
    (
        Id_ResultAI INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ApplicationId INT NULL,
        Result VARCHAR(50) NULL,
        CONSTRAINT FK_AI_Result_Application FOREIGN KEY (ApplicationId) REFERENCES dbo.Application(ApplicationID)
    );
END
GO

IF OBJECT_ID('dbo.Historique_Application', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Historique_Application
    (
        IdHistorique INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        IdApplication INT NULL,
        IdState INT NULL,
        JobPosting VARCHAR(MAX) NULL,
        DateHist DATE NULL,
        CONSTRAINT FK_Historique_Application_Application FOREIGN KEY (IdApplication) REFERENCES dbo.Application(ApplicationID),
        CONSTRAINT FK_Historique_Application_State FOREIGN KEY (IdState) REFERENCES dbo.State(IdState)
    );
END
GO

IF OBJECT_ID('dbo.Invoice', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoice
    (
        InvoiceID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        InvoiceDate DATE NULL,
        TotaleAmount DECIMAL(10,2) NULL,
        PaymentStatus VARCHAR(MAX) NULL,
        UserID INT NULL
    );
END
GO

IF OBJECT_ID('dbo.Payment', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payment
    (
        PaymentID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Amount DECIMAL(10,2) NULL,
        PaymentDate DATE NULL,
        PaymentMethodeID INT NOT NULL,
        InvoiceID INT NULL,
        CONSTRAINT FK_Payment_Invoice FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoice(InvoiceID),
        CONSTRAINT FK_Payment_PaymentMethode FOREIGN KEY (PaymentMethodeID) REFERENCES dbo.PaymentMethode(PaymentMethodeID)
    );
END
GO

IF OBJECT_ID('dbo.EmailConfirmation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailConfirmation
    (
        ConfirmationID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ConfirmationToken VARCHAR(MAX) NULL,
        SentDate DATE NULL,
        IsConfirmed BIT NULL,
        UserID INT NULL,
        PaymentID INT NULL,
        CONSTRAINT FK_EmailConfirmation_Payment FOREIGN KEY (PaymentID) REFERENCES dbo.Payment(PaymentID)
    );
END
GO

IF OBJECT_ID('dbo.Certificate', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Certificate
    (
        CertificateID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CertificateName VARCHAR(MAX) NULL,
        UserID INT NULL,
        CourseID INT NULL,
        isActive BIT NULL,
        CONSTRAINT FK_Certificate_Course FOREIGN KEY (CourseID) REFERENCES dbo.Course(CourseID)
    );
END
GO

IF OBJECT_ID('dbo.Feedback', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Feedback
    (
        FeedBackID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        FeedBackText VARCHAR(MAX) NULL,
        Rating INT NULL,
        UserID INT NULL,
        CourseID INT NULL,
        isActive BIT NULL,
        CONSTRAINT FK_Feedback_Course FOREIGN KEY (CourseID) REFERENCES dbo.Course(CourseID)
    );
END
GO

IF OBJECT_ID('dbo.Participation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Participation
    (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserID INT NULL,
        CourseID INT NULL,
        [Date] DATE NULL,
        CONSTRAINT FK_Participation_Course FOREIGN KEY (CourseID) REFERENCES dbo.Course(CourseID)
    );
END
GO

IF OBJECT_ID('dbo.Test', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Test
    (
        TestID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Title VARCHAR(MAX) NULL,
        Description VARCHAR(MAX) NULL,
        CourseID INT NULL,
        isActive BIT NULL,
        CONSTRAINT FK_Test_course FOREIGN KEY (CourseID) REFERENCES dbo.Course(CourseID)
    );
END
GO

IF OBJECT_ID('dbo.Response', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Response
    (
        ResponseID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Value VARCHAR(MAX) NULL,
        UserID INT NULL,
        QuestionID INT NULL
    );
END
GO

IF OBJECT_ID('dbo.Response_Details', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Response_Details
    (
        ResponseDetailsID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Description VARCHAR(MAX) NOT NULL,
        ResponseID INT NULL,
        AnswerID INT NULL,
        CONSTRAINT FK_Response_Details_Response FOREIGN KEY (ResponseID) REFERENCES dbo.Response(ResponseID)
    );
END
GO

IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications
    (
        NotificationId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Message VARCHAR(MAX) NULL,
        Timestamp DATETIME NULL,
        IsRead BIT NULL,
        userId INT NULL,
        CONSTRAINT FK_Notifications_user FOREIGN KEY (userId) REFERENCES dbo.[user](User_Id)
    );
END
GO

IF OBJECT_ID('dbo.Suivi', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Suivi
    (
        Id_Suivi INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        User_id INT NULL,
        Id_Process INT NULL,
        Id_Status INT NULL,
        [Date] DATE NULL,
        Remarque VARCHAR(50) NULL,
        Id_user_rq INT NULL,
        CONSTRAINT FK_Suivi_User FOREIGN KEY (User_id) REFERENCES dbo.[user](User_Id)
    );
END
GO

-- Seed roles
IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE Description = 'Admin')
BEGIN
    INSERT INTO dbo.Role (Description) VALUES ('Admin');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE Description = 'RH')
BEGIN
    INSERT INTO dbo.Role (Description) VALUES ('RH');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Role WHERE Description = 'TeamLeader')
BEGIN
    INSERT INTO dbo.Role (Description) VALUES ('TeamLeader');
END
GO

-- Seed admin user (plain text password, matching current code behavior)
IF NOT EXISTS (SELECT 1 FROM dbo.[user] WHERE Email = 'admin@test.com')
BEGIN
    INSERT INTO dbo.[user] (Name, Prename, Email, Password, Role_Id, Etat)
    VALUES
    (
        'Admin User',
        'admin',
        'admin@test.com',
        '123456',
        (SELECT TOP 1 Role_Id FROM dbo.Role WHERE Description = 'Admin'),
        1
    );
END
GO
