-- =====================================================================
-- Restauration automatique des bases TriCareer
-- Les noms logiques des fichiers .bak sont détectés dynamiquement
-- (RESTORE FILELISTONLY) pour éviter de les coder en dur.
-- =====================================================================
SET NOCOUNT ON;
GO

-- ---------------------------------------------------------------------
-- 1) Restauration de TriCareerDb
-- ---------------------------------------------------------------------
IF DB_ID(N'TriCareerDb') IS NULL
BEGIN
    PRINT '[init] Restauration de TriCareerDb...';

    DECLARE @bak  NVARCHAR(260) = N'/var/opt/mssql/backup/TriCareer.bak';
    DECLARE @data NVARCHAR(260) = N'/var/opt/mssql/data/';

    DECLARE @files TABLE (
        LogicalName NVARCHAR(128), PhysicalName NVARCHAR(260), [Type] CHAR(1),
        FileGroupName NVARCHAR(128), [Size] NUMERIC(20,0), MaxSize NUMERIC(20,0),
        FileID BIGINT, CreateLSN NUMERIC(25,0), DropLSN NUMERIC(25,0),
        UniqueID UNIQUEIDENTIFIER, ReadOnlyLSN NUMERIC(25,0), ReadWriteLSN NUMERIC(25,0),
        BackupSizeInBytes BIGINT, SourceBlockSize INT, FileGroupID INT,
        LogGroupGUID UNIQUEIDENTIFIER, DifferentialBaseLSN NUMERIC(25,0),
        DifferentialBaseGUID UNIQUEIDENTIFIER, IsReadOnly BIT, IsPresent BIT,
        TDEThumbprint VARBINARY(32), SnapshotURL NVARCHAR(360)
    );

    INSERT INTO @files EXEC (N'RESTORE FILELISTONLY FROM DISK = N''' + @bak + N'''');

    DECLARE @move NVARCHAR(MAX) = N'';
    SELECT @move = @move + N', MOVE N''' + LogicalName + N''' TO N'''
                 + @data + N'TriCareerDb_' + CAST(FileID AS NVARCHAR(10))
                 + CASE WHEN [Type] = 'L' THEN N'.ldf' ELSE N'.mdf' END + N''''
    FROM @files;

    DECLARE @sql NVARCHAR(MAX) =
        N'RESTORE DATABASE [TriCareerDb] FROM DISK = N''' + @bak + N''' WITH REPLACE' + @move;
    EXEC (@sql);
    PRINT '[init] TriCareerDb restaurée.';
END
ELSE
    PRINT '[init] TriCareerDb existe déjà, restauration ignorée.';
GO

-- ---------------------------------------------------------------------
-- 2) Restauration de la base keycloak
-- ---------------------------------------------------------------------
IF DB_ID(N'keycloak') IS NULL
BEGIN
    PRINT '[init] Restauration de keycloak...';

    DECLARE @bak  NVARCHAR(260) = N'/var/opt/mssql/backup/keycloak.bak';
    DECLARE @data NVARCHAR(260) = N'/var/opt/mssql/data/';

    DECLARE @files TABLE (
        LogicalName NVARCHAR(128), PhysicalName NVARCHAR(260), [Type] CHAR(1),
        FileGroupName NVARCHAR(128), [Size] NUMERIC(20,0), MaxSize NUMERIC(20,0),
        FileID BIGINT, CreateLSN NUMERIC(25,0), DropLSN NUMERIC(25,0),
        UniqueID UNIQUEIDENTIFIER, ReadOnlyLSN NUMERIC(25,0), ReadWriteLSN NUMERIC(25,0),
        BackupSizeInBytes BIGINT, SourceBlockSize INT, FileGroupID INT,
        LogGroupGUID UNIQUEIDENTIFIER, DifferentialBaseLSN NUMERIC(25,0),
        DifferentialBaseGUID UNIQUEIDENTIFIER, IsReadOnly BIT, IsPresent BIT,
        TDEThumbprint VARBINARY(32), SnapshotURL NVARCHAR(360)
    );

    INSERT INTO @files EXEC (N'RESTORE FILELISTONLY FROM DISK = N''' + @bak + N'''');

    DECLARE @move NVARCHAR(MAX) = N'';
    SELECT @move = @move + N', MOVE N''' + LogicalName + N''' TO N'''
                 + @data + N'keycloak_' + CAST(FileID AS NVARCHAR(10))
                 + CASE WHEN [Type] = 'L' THEN N'.ldf' ELSE N'.mdf' END + N''''
    FROM @files;

    DECLARE @sql NVARCHAR(MAX) =
        N'RESTORE DATABASE [keycloak] FROM DISK = N''' + @bak + N''' WITH REPLACE' + @move;
    EXEC (@sql);
    PRINT '[init] Base keycloak restaurée.';
END
ELSE
    PRINT '[init] Base keycloak existe déjà, restauration ignorée.';
GO

-- ---------------------------------------------------------------------
-- 3) Login serveur "keycloak_user" attendu par Keycloak
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'keycloak_user')
BEGIN
    CREATE LOGIN [keycloak_user]
        WITH PASSWORD = N'Keycloak!Passw0rd',
             DEFAULT_DATABASE = [keycloak],
             CHECK_POLICY = OFF;
    PRINT '[init] Login keycloak_user créé.';
END
GO

-- ---------------------------------------------------------------------
-- 4) Mappe / répare l'utilisateur keycloak_user dans la base keycloak
--    (après restauration, l'utilisateur est "orphelin" et doit être relié au login)
-- ---------------------------------------------------------------------
USE [keycloak];
GO
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'keycloak_user' AND type IN ('S','U'))
    ALTER USER [keycloak_user] WITH LOGIN = [keycloak_user];
ELSE
    CREATE USER [keycloak_user] FOR LOGIN [keycloak_user];
GO
ALTER ROLE [db_owner] ADD MEMBER [keycloak_user];
GO
PRINT '[init] Utilisateur keycloak_user prêt sur la base keycloak.';
GO

-- ---------------------------------------------------------------------
-- 5) Réinitialise les sommes de contrôle Liquibase de Keycloak
--    La base keycloak.bak provient d'une version plus ancienne de Keycloak ;
--    en mettant MD5SUM à NULL, la version récente (26.x) les recalcule au
--    démarrage au lieu d'échouer sur une "ValidationFailedException".
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'[keycloak].[dbo].[DATABASECHANGELOG]', N'U') IS NOT NULL
BEGIN
    UPDATE [keycloak].[dbo].[DATABASECHANGELOG] SET MD5SUM = NULL;
    PRINT '[init] Sommes de contrôle Liquibase Keycloak réinitialisées.';
END
GO

-- ---------------------------------------------------------------------
-- 6) Patchs de schéma TriCareerDb (colonnes/tables ajoutées par les nouvelles US)
-- ---------------------------------------------------------------------
USE [TriCareerDb];
GO

-- US17 : compteur anti-triche (sorties d'onglet) sur la table Session
IF COL_LENGTH('dbo.[Session]', 'TabSwitchCount') IS NULL
BEGIN
    ALTER TABLE [dbo].[Session] ADD TabSwitchCount INT NULL;
    PRINT '[init] Colonne Session.TabSwitchCount ajoutée.';
END
GO

-- US23/US29 : table de résultats de matching IA (écrite par le micro-service matching)
IF OBJECT_ID(N'dbo.MatchCV', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MatchCV (
        Id             INT IDENTITY(1,1) PRIMARY KEY,
        ApplicationID  INT NOT NULL,
        JobPostingID   INT NULL,
        CandidateId    INT NULL,
        Skills         NVARCHAR(MAX) NULL,
        Matching_Score FLOAT NULL
    );
    PRINT '[init] Table dbo.MatchCV créée.';
END
GO

-- Colonnes "récentes" de la table Application attendues par le code mais absentes
-- de la sauvegarde .bak (sinon EF échoue : "Invalid column name ...").
IF COL_LENGTH('dbo.Application', 'AssignedTeamLeaderId') IS NULL
    ALTER TABLE [dbo].[Application] ADD AssignedTeamLeaderId INT NULL;
GO
IF COL_LENGTH('dbo.Application', 'HrScore') IS NULL
    ALTER TABLE [dbo].[Application] ADD HrScore INT NULL;
GO
IF COL_LENGTH('dbo.Application', 'TechScore') IS NULL
    ALTER TABLE [dbo].[Application] ADD TechScore INT NULL;
GO
IF COL_LENGTH('dbo.Application', 'TestScore') IS NULL
    ALTER TABLE [dbo].[Application] ADD TestScore INT NULL;
GO
IF COL_LENGTH('dbo.Application', 'FinalScore') IS NULL
    ALTER TABLE [dbo].[Application] ADD FinalScore DECIMAL(18,2) NULL;
GO
IF COL_LENGTH('dbo.Application', 'AdminDecision') IS NULL
    ALTER TABLE [dbo].[Application] ADD AdminDecision NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.Application', 'IsRecommended') IS NULL
    ALTER TABLE [dbo].[Application] ADD IsRecommended BIT NOT NULL CONSTRAINT DF_Application_IsRecommended DEFAULT(0);
GO
PRINT '[init] Colonnes récentes de Application vérifiées/ajoutées.';
GO

-- Colonne MeetLink manquante sur RecruitementProcess (attendue par le code)
IF COL_LENGTH('dbo.RecruitementProcess', 'MeetLink') IS NULL
    ALTER TABLE [dbo].[RecruitementProcess] ADD MeetLink NVARCHAR(MAX) NULL;
GO

-- Donnée de référence manquante : état "Refusé" (IdState=4) utilisé par le code
-- (flux de candidature / décision). Sans elle, l'INSERT d'une Application viole
-- la contrainte FK_Application_State.
IF NOT EXISTS (SELECT 1 FROM dbo.[State] WHERE IdState = 4)
BEGIN
    SET IDENTITY_INSERT dbo.[State] ON;
    INSERT INTO dbo.[State] (IdState, NameState) VALUES (4, N'Refusé');
    SET IDENTITY_INSERT dbo.[State] OFF;
    PRINT '[init] État State(4)=Refusé ajouté.';
END
GO

-- US20 : stockage des rapports d'évaluation générés par l'IA
IF OBJECT_ID(N'dbo.EvaluationReport', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EvaluationReport (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        ApplicationId INT NOT NULL,
        Content       NVARCHAR(MAX) NULL,
        CreatedAt     DATETIME NOT NULL CONSTRAINT DF_EvaluationReport_CreatedAt DEFAULT(GETDATE())
    );
    PRINT '[init] Table dbo.EvaluationReport créée.';
END
GO

-- ============================================================================
-- 7) SEED DÉMO : associe à chaque candidature de démonstration un CV réel (baké
--    dans l'image API, dossier Resources/Cv) + des scores d'évaluation. Ainsi
--    « Décision Finale », « Classement IA » et le téléchargement de CV sont
--    fonctionnels dès la première installation (CV présents => scores réels).
-- ============================================================================
USE [TriCareerDb];
GO
UPDATE dbo.Application SET CvPath = N'cv_amenygharbi.pdf' WHERE ApplicationID = 1007;
UPDATE dbo.Application SET CvPath = N'cv_testtest.pdf'    WHERE ApplicationID = 2002;
UPDATE dbo.Application SET CvPath = N'cv_testameny.pdf'   WHERE ApplicationID = 4002;
UPDATE dbo.Application SET CvPath = N'cv_designer.pdf'    WHERE ApplicationID = 5002;
UPDATE dbo.Application SET CvPath = N'cv_amenyyy.pdf'     WHERE ApplicationID = 6002;
GO
-- Scores d'évaluation de démonstration (n'écrase pas des valeurs déjà saisies)
UPDATE dbo.Application SET FinalScore=88, HrScore=85, TechScore=90, TestScore=82, IsRecommended=1 WHERE ApplicationID=6002 AND FinalScore IS NULL;
UPDATE dbo.Application SET FinalScore=76, HrScore=72, TechScore=78, TestScore=70, IsRecommended=1 WHERE ApplicationID=5002 AND FinalScore IS NULL;
UPDATE dbo.Application SET FinalScore=81, HrScore=80, TechScore=83, TestScore=79, IsRecommended=1 WHERE ApplicationID=4002 AND FinalScore IS NULL;
UPDATE dbo.Application SET FinalScore=69, HrScore=65, TechScore=72, TestScore=68, IsRecommended=0 WHERE ApplicationID=2002 AND FinalScore IS NULL;
UPDATE dbo.Application SET FinalScore=73, HrScore=70, TechScore=75, TestScore=71, IsRecommended=1 WHERE ApplicationID=1007 AND FinalScore IS NULL;
GO

-- Candidats (table Candidate) requis par le CLASSEMENT IA : /match fait
-- « JOIN Candidate c ON a.CandidateId = c.CandidateId » ; sans ligne Candidate,
-- la candidature est exclue du classement. On crée un candidat par candidature.
SET IDENTITY_INSERT dbo.Candidate ON;
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE CandidateId=2)
    INSERT INTO dbo.Candidate (CandidateId, FirstName, LastName, Email, CreatedAt) VALUES (2, N'designer', N'', N'designer.demo@tricareer.local', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE CandidateId=3)
    INSERT INTO dbo.Candidate (CandidateId, FirstName, LastName, Email, CreatedAt) VALUES (3, N'test', N'ameny', N'testameny.demo@tricareer.local', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE CandidateId=4)
    INSERT INTO dbo.Candidate (CandidateId, FirstName, LastName, Email, CreatedAt) VALUES (4, N'test', N'test', N'testtest.demo@tricareer.local', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE CandidateId=5)
    INSERT INTO dbo.Candidate (CandidateId, FirstName, LastName, Email, CreatedAt) VALUES (5, N'ameny', N'gharbi', N'amenygharbi.demo@tricareer.local', GETDATE());
SET IDENTITY_INSERT dbo.Candidate OFF;
GO
UPDATE dbo.Application SET CandidateId=1 WHERE ApplicationID=6002;
UPDATE dbo.Application SET CandidateId=2 WHERE ApplicationID=5002;
UPDATE dbo.Application SET CandidateId=3 WHERE ApplicationID=4002;
UPDATE dbo.Application SET CandidateId=4 WHERE ApplicationID=2002;
UPDATE dbo.Application SET CandidateId=5 WHERE ApplicationID=1007;
GO

-- Compte ÉTUDIANT de démo (pour tester le passage d'un quiz + voir son score).
-- Le login se fait par email/mot de passe ; « Mes Tests » relie l'étudiant à ses
-- candidatures par l'email -> on crée aussi une Application au même email.
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'mouna.chokri@gmail.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat)
    VALUES (N'Mouna', N'Chokri', N'mouna.chokri@gmail.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'mouna.chokri@gmail.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, IdState, NameApplication, email, PhoneNumber, CvPath)
    VALUES (3002, GETDATE(), 1, N'Mouna Chokri', N'mouna.chokri@gmail.com', 29624037, N'cv_amenyyy.pdf');
GO
PRINT '[init] Seed démo : CV + scores + candidats + étudiant démo appliqués.';
GO

-- ========================= SEED RÉALISTE (auto-généré) =========================
-- ============================================================================
-- SEED RÉALISTE (additif, idempotent) : offres, candidats (comptes + candidatures),
-- staff supplémentaires, notifications. Généré automatiquement.
-- ============================================================================
USE [TriCareerDb];
GO
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Développeur Full Stack' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Développeur Full Stack', N'Nous recherchons un développeur full stack pour concevoir et développer des applications web modernes de bout en bout.', N'Bac+5 en informatique, 2 ans d''expérience', N'Développer de nouvelles fonctionnalités, écrire des tests, participer aux revues de code, collaborer avec l''équipe produit.', N'JavaScript, TypeScript, React, Node.js, Express, SQL, REST API, Git, Docker', N'2-4 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Ingénieur DevOps' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Ingénieur DevOps', N'Rejoignez notre équipe pour automatiser et fiabiliser nos déploiements et notre infrastructure cloud.', N'Expérience CI/CD, conteneurisation, cloud.', N'Mettre en place les pipelines CI/CD, gérer l''infrastructure, superviser la production, améliorer l''observabilité.', N'Docker, Kubernetes, Jenkins, GitLab CI, Terraform, AWS, Linux, Prometheus, Grafana', N'3-5 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Développeur Backend Java' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Développeur Backend Java', N'Développeur backend pour construire des services robustes et performants avec Spring Boot.', N'Bonne maîtrise de Java et Spring, connaissance', N'Concevoir des API REST, optimiser les performances, assurer la qualité et la sécurité du code.', N'Java, Spring Boot, Hibernate, SQL, PostgreSQL, REST API, Maven, JUnit, Docker', N'2-4 ans', N'Sfax', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Développeur Frontend React' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Développeur Frontend React', N'Intégrateur/développeur frontend passionné par les interfaces performantes et accessibles.', N'Maîtrise de React et de l''écosystème JavaScript', N'Intégrer les maquettes, développer des composants réutilisables, optimiser les performances front.', N'React, TypeScript, Redux, Tailwind CSS, HTML, CSS, Vite, Jest, Git', N'1-3 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Ingénieur Data / IA' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Ingénieur Data / IA', N'Ingénieur data pour exploiter la donnée et développer des modèles d''apprentissage automatique.', N'Solides bases en statistiques, Python et machine', N'Construire des pipelines de données, entraîner et évaluer des modèles, déployer des solutions IA.', N'Python, Pandas, scikit-learn, TensorFlow, SQL, NLP, Machine Learning, Docker', N'2-5 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Administrateur Systèmes & Réseaux' AND DepartmentId = 2)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Administrateur Systèmes & Réseaux', N'Administrateur pour garantir la disponibilité et la sécurité de nos systèmes et réseaux.', N'Expérience en administration Linux/Windows et', N'Administrer les serveurs, gérer la sécurité, superviser le réseau, assurer les sauvegardes.', N'Linux, Windows Server, Réseaux, Sécurité, Bash, Active Directory, VMware', N'3-6 ans', N'Ariana', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 2);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'UI/UX Designer' AND DepartmentId = 1)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'UI/UX Designer', N'Designer UI/UX pour concevoir des expériences utilisateur intuitives et esthétiques.', N'Maîtrise des outils de design et des principes', N'Réaliser des wireframes et prototypes, mener des recherches utilisateurs, créer des design systems.', N'Figma, Adobe XD, UI Design, UX Research, Prototypage, Wireframing, Design System', N'2-4 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Web Designer' AND DepartmentId = 1)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Web Designer', N'Web designer créatif pour concevoir des sites web modernes et responsives.', N'Créativité, maîtrise des outils graphiques et', N'Concevoir des maquettes web, créer des visuels, collaborer avec les développeurs.', N'Photoshop, Illustrator, Figma, HTML, CSS, Responsive Design, Webdesign', N'1-3 ans', N'Sousse', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Graphiste' AND DepartmentId = 1)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Graphiste', N'Graphiste pour créer des supports de communication visuelle percutants.', N'Bonne culture graphique et maîtrise de la suite', N'Créer des visuels print et digital, décliner les chartes graphiques, respecter les délais.', N'Photoshop, Illustrator, InDesign, Branding, Typographie, Colorimétrie', N'1-3 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Rédacteur Web SEO' AND DepartmentId = 3)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Rédacteur Web SEO', N'Rédacteur web pour produire des contenus optimisés pour le référencement naturel.', N'Excellente expression écrite en français, notions', N'Rédiger des articles optimisés, effectuer des recherches de mots-clés, respecter la ligne éditoriale.', N'Rédaction, SEO, WordPress, Content, Mots-clés, Français, Relecture', N'1-3 ans', N'Télétravail', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 3);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Content Manager' AND DepartmentId = 3)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Content Manager', N'Content manager pour piloter la stratégie de contenu sur l''ensemble des canaux.', N'Expérience en gestion de contenu et réseaux', N'Définir le calendrier éditorial, coordonner les rédacteurs, analyser les performances.', N'Content Strategy, SEO, Réseaux sociaux, WordPress, Analytics, Rédaction', N'2-4 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 3);
IF NOT EXISTS (SELECT 1 FROM dbo.JobPosting WHERE PositionTitle = N'Chargé de Recrutement' AND DepartmentId = 4)
    INSERT INTO dbo.JobPosting (PositionTitle, Description, Requirements, Missions, Skills, Experience, Location, DatePosted, ApplicationDeadline, IsActive, DepartmentId)
    VALUES (N'Chargé de Recrutement', N'Chargé de recrutement pour piloter le sourcing et la sélection des talents.', N'Expérience en recrutement, aisance relationnelle.', N'Rédiger les offres, sourcer les candidats, mener les entretiens, suivre les candidatures.', N'Recrutement, Sourcing, Entretien, LinkedIn, RH, Communication', N'2-4 ans', N'Tunis', GETDATE(), DATEADD(day, 30, GETDATE()), 1, 4);
GO
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'ahmed.benali1@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Ahmed', N'Ben Ali', N'ahmed.benali1@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'ahmed.benali1@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Ahmed', N'Ben Ali', N'ahmed.benali1@example.com', N'22867825', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'ahmed.benali1@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Full Stack' ORDER BY JobPostingID DESC),
           DATEADD(day, -15, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'ahmed.benali1@example.com'),
           1, N'cv_amenyyy.pdf', N'Ahmed Ben Ali', N'ahmed.benali1@example.com', 22867825,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'ahmed.benali1@example.com'),
           61, 56, 67, 60, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'mohamed.trabelsi2@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Mohamed', N'Trabelsi', N'mohamed.trabelsi2@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'mohamed.trabelsi2@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Mohamed', N'Trabelsi', N'mohamed.trabelsi2@example.com', N'23341057', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'mohamed.trabelsi2@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur DevOps' ORDER BY JobPostingID DESC),
           DATEADD(day, -58, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'mohamed.trabelsi2@example.com'),
           1, N'cv_designer.pdf', N'Mohamed Trabelsi', N'mohamed.trabelsi2@example.com', 23341057,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'mohamed.trabelsi2@example.com'),
           82, 61, 93, 92, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'ali.gharbi3@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Ali', N'Gharbi', N'ali.gharbi3@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'ali.gharbi3@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Ali', N'Gharbi', N'ali.gharbi3@example.com', N'22458591', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'ali.gharbi3@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Backend Java' ORDER BY JobPostingID DESC),
           DATEADD(day, -2, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'ali.gharbi3@example.com'),
           1, N'cv_testameny.pdf', N'Ali Gharbi', N'ali.gharbi3@example.com', 22458591,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'ali.gharbi3@example.com'),
           72, 92, 77, 47, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'youssef.bouazizi4@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Youssef', N'Bouazizi', N'youssef.bouazizi4@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'youssef.bouazizi4@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Youssef', N'Bouazizi', N'youssef.bouazizi4@example.com', N'22571945', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'youssef.bouazizi4@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Frontend React' ORDER BY JobPostingID DESC),
           DATEADD(day, -39, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'youssef.bouazizi4@example.com'),
           2, N'cv_testtest.pdf', N'Youssef Bouazizi', N'youssef.bouazizi4@example.com', 22571945,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'youssef.bouazizi4@example.com'),
           70, 68, 64, 77, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'hedi.jelassi5@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Hedi', N'Jelassi', N'hedi.jelassi5@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'hedi.jelassi5@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Hedi', N'Jelassi', N'hedi.jelassi5@example.com', N'21445199', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'hedi.jelassi5@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur Data / IA' ORDER BY JobPostingID DESC),
           DATEADD(day, -42, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'hedi.jelassi5@example.com'),
           2, N'cv_amenygharbi.pdf', N'Hedi Jelassi', N'hedi.jelassi5@example.com', 21445199,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'hedi.jelassi5@example.com'),
           81, 90, 62, 90, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'sami.khelifi6@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Sami', N'Khelifi', N'sami.khelifi6@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'sami.khelifi6@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Sami', N'Khelifi', N'sami.khelifi6@example.com', N'28038374', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'sami.khelifi6@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Administrateur Systèmes & Réseaux' ORDER BY JobPostingID DESC),
           DATEADD(day, -18, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'sami.khelifi6@example.com'),
           3, N'cv_amenyyy.pdf', N'Sami Khelifi', N'sami.khelifi6@example.com', 28038374,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'sami.khelifi6@example.com'),
           76, 69, 78, 82, 1, N'Approved';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'karim.sassi7@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Karim', N'Sassi', N'karim.sassi7@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'karim.sassi7@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Karim', N'Sassi', N'karim.sassi7@example.com', N'21109031', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'karim.sassi7@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'UI/UX Designer' ORDER BY JobPostingID DESC),
           DATEADD(day, -22, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'karim.sassi7@example.com'),
           1, N'cv_designer.pdf', N'Karim Sassi', N'karim.sassi7@example.com', 21109031,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'karim.sassi7@example.com'),
           77, 65, 94, 72, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'bilel.mansour8@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Bilel', N'Mansour', N'bilel.mansour8@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'bilel.mansour8@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Bilel', N'Mansour', N'bilel.mansour8@example.com', N'25661907', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'bilel.mansour8@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Web Designer' ORDER BY JobPostingID DESC),
           DATEADD(day, -22, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'bilel.mansour8@example.com'),
           1, N'cv_testameny.pdf', N'Bilel Mansour', N'bilel.mansour8@example.com', 25661907,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'bilel.mansour8@example.com'),
           73, 64, 63, 93, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'nizar.chaabane9@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Nizar', N'Chaabane', N'nizar.chaabane9@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'nizar.chaabane9@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Nizar', N'Chaabane', N'nizar.chaabane9@example.com', N'22714803', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'nizar.chaabane9@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Graphiste' ORDER BY JobPostingID DESC),
           DATEADD(day, -23, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'nizar.chaabane9@example.com'),
           1, N'cv_testtest.pdf', N'Nizar Chaabane', N'nizar.chaabane9@example.com', 22714803,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'nizar.chaabane9@example.com'),
           62, 60, 74, 51, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'wael.bouzid10@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Wael', N'Bouzid', N'wael.bouzid10@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'wael.bouzid10@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Wael', N'Bouzid', N'wael.bouzid10@example.com', N'26770619', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'wael.bouzid10@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Rédacteur Web SEO' ORDER BY JobPostingID DESC),
           DATEADD(day, -47, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'wael.bouzid10@example.com'),
           2, N'cv_amenygharbi.pdf', N'Wael Bouzid', N'wael.bouzid10@example.com', 26770619,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'wael.bouzid10@example.com'),
           69, 93, 66, 47, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'ines.hammami11@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Ines', N'Hammami', N'ines.hammami11@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'ines.hammami11@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Ines', N'Hammami', N'ines.hammami11@example.com', N'28707870', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'ines.hammami11@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Content Manager' ORDER BY JobPostingID DESC),
           DATEADD(day, -6, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'ines.hammami11@example.com'),
           2, N'cv_amenyyy.pdf', N'Ines Hammami', N'ines.hammami11@example.com', 28707870,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'ines.hammami11@example.com'),
           72, 89, 57, 69, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'sarra.nasri12@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Sarra', N'Nasri', N'sarra.nasri12@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'sarra.nasri12@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Sarra', N'Nasri', N'sarra.nasri12@example.com', N'25918715', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'sarra.nasri12@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Chargé de Recrutement' ORDER BY JobPostingID DESC),
           DATEADD(day, -37, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'sarra.nasri12@example.com'),
           3, N'cv_designer.pdf', N'Sarra Nasri', N'sarra.nasri12@example.com', 25918715,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'sarra.nasri12@example.com'),
           84, 95, 89, 68, 1, N'Approved';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'amira.ferchichi13@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Amira', N'Ferchichi', N'amira.ferchichi13@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'amira.ferchichi13@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Amira', N'Ferchichi', N'amira.ferchichi13@example.com', N'24226067', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'amira.ferchichi13@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Full Stack' ORDER BY JobPostingID DESC),
           DATEADD(day, -15, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'amira.ferchichi13@example.com'),
           1, N'cv_testameny.pdf', N'Amira Ferchichi', N'amira.ferchichi13@example.com', 24226067,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'amira.ferchichi13@example.com'),
           66, 59, 52, 87, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'rania.ayari14@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Rania', N'Ayari', N'rania.ayari14@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'rania.ayari14@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Rania', N'Ayari', N'rania.ayari14@example.com', N'25855124', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'rania.ayari14@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur DevOps' ORDER BY JobPostingID DESC),
           DATEADD(day, -25, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'rania.ayari14@example.com'),
           1, N'cv_testtest.pdf', N'Rania Ayari', N'rania.ayari14@example.com', 25855124,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'rania.ayari14@example.com'),
           58, 60, 64, 51, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'nour.zouari15@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Nour', N'Zouari', N'nour.zouari15@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'nour.zouari15@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Nour', N'Zouari', N'nour.zouari15@example.com', N'25663623', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'nour.zouari15@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Backend Java' ORDER BY JobPostingID DESC),
           DATEADD(day, -11, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'nour.zouari15@example.com'),
           1, N'cv_amenygharbi.pdf', N'Nour Zouari', N'nour.zouari15@example.com', 25663623,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'nour.zouari15@example.com'),
           81, 84, 90, 68, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'emna.baccouche16@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Emna', N'Baccouche', N'emna.baccouche16@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'emna.baccouche16@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Emna', N'Baccouche', N'emna.baccouche16@example.com', N'27210606', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'emna.baccouche16@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Frontend React' ORDER BY JobPostingID DESC),
           DATEADD(day, -18, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'emna.baccouche16@example.com'),
           2, N'cv_amenyyy.pdf', N'Emna Baccouche', N'emna.baccouche16@example.com', 27210606,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'emna.baccouche16@example.com'),
           76, 77, 63, 87, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'yosra.mejri17@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Yosra', N'Mejri', N'yosra.mejri17@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'yosra.mejri17@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Yosra', N'Mejri', N'yosra.mejri17@example.com', N'22197935', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'yosra.mejri17@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur Data / IA' ORDER BY JobPostingID DESC),
           DATEADD(day, -35, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'yosra.mejri17@example.com'),
           2, N'cv_designer.pdf', N'Yosra Mejri', N'yosra.mejri17@example.com', 22197935,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'yosra.mejri17@example.com'),
           79, 93, 90, 55, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'salma.riahi18@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Salma', N'Riahi', N'salma.riahi18@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'salma.riahi18@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Salma', N'Riahi', N'salma.riahi18@example.com', N'25107245', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'salma.riahi18@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Administrateur Systèmes & Réseaux' ORDER BY JobPostingID DESC),
           DATEADD(day, -18, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'salma.riahi18@example.com'),
           3, N'cv_testameny.pdf', N'Salma Riahi', N'salma.riahi18@example.com', 25107245,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'salma.riahi18@example.com'),
           71, 65, 79, 69, 0, N'Approved';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'mariem.ltaief19@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Mariem', N'Ltaief', N'mariem.ltaief19@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'mariem.ltaief19@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Mariem', N'Ltaief', N'mariem.ltaief19@example.com', N'24684531', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'mariem.ltaief19@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'UI/UX Designer' ORDER BY JobPostingID DESC),
           DATEADD(day, -53, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'mariem.ltaief19@example.com'),
           1, N'cv_testtest.pdf', N'Mariem Ltaief', N'mariem.ltaief19@example.com', 24684531,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'mariem.ltaief19@example.com'),
           62, 75, 53, 59, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'farah.guesmi20@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Farah', N'Guesmi', N'farah.guesmi20@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'farah.guesmi20@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Farah', N'Guesmi', N'farah.guesmi20@example.com', N'21538552', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'farah.guesmi20@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Web Designer' ORDER BY JobPostingID DESC),
           DATEADD(day, -5, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'farah.guesmi20@example.com'),
           1, N'cv_amenygharbi.pdf', N'Farah Guesmi', N'farah.guesmi20@example.com', 21538552,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'farah.guesmi20@example.com'),
           71, 75, 75, 62, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'oussama.karray21@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Oussama', N'Karray', N'oussama.karray21@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'oussama.karray21@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Oussama', N'Karray', N'oussama.karray21@example.com', N'24539704', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'oussama.karray21@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Graphiste' ORDER BY JobPostingID DESC),
           DATEADD(day, -14, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'oussama.karray21@example.com'),
           1, N'cv_amenyyy.pdf', N'Oussama Karray', N'oussama.karray21@example.com', 24539704,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'oussama.karray21@example.com'),
           84, 91, 95, 65, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'aymen.dridi22@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Aymen', N'Dridi', N'aymen.dridi22@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'aymen.dridi22@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Aymen', N'Dridi', N'aymen.dridi22@example.com', N'29375710', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'aymen.dridi22@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Rédacteur Web SEO' ORDER BY JobPostingID DESC),
           DATEADD(day, -10, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'aymen.dridi22@example.com'),
           2, N'cv_designer.pdf', N'Aymen Dridi', N'aymen.dridi22@example.com', 29375710,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'aymen.dridi22@example.com'),
           82, 80, 91, 74, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'firas.amri23@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Firas', N'Amri', N'firas.amri23@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'firas.amri23@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Firas', N'Amri', N'firas.amri23@example.com', N'25443951', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'firas.amri23@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Content Manager' ORDER BY JobPostingID DESC),
           DATEADD(day, -36, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'firas.amri23@example.com'),
           2, N'cv_testameny.pdf', N'Firas Amri', N'firas.amri23@example.com', 25443951,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'firas.amri23@example.com'),
           73, 63, 65, 92, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'skander.belhaj24@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Skander', N'Belhaj', N'skander.belhaj24@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'skander.belhaj24@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Skander', N'Belhaj', N'skander.belhaj24@example.com', N'25408072', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'skander.belhaj24@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Chargé de Recrutement' ORDER BY JobPostingID DESC),
           DATEADD(day, -26, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'skander.belhaj24@example.com'),
           3, N'cv_testtest.pdf', N'Skander Belhaj', N'skander.belhaj24@example.com', 25408072,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'skander.belhaj24@example.com'),
           84, 92, 77, 82, 1, N'Approved';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'hamza.tounsi25@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Hamza', N'Tounsi', N'hamza.tounsi25@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'hamza.tounsi25@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Hamza', N'Tounsi', N'hamza.tounsi25@example.com', N'27073292', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'hamza.tounsi25@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Full Stack' ORDER BY JobPostingID DESC),
           DATEADD(day, -32, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'hamza.tounsi25@example.com'),
           1, N'cv_amenygharbi.pdf', N'Hamza Tounsi', N'hamza.tounsi25@example.com', 27073292,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'hamza.tounsi25@example.com'),
           68, 69, 58, 77, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'ghada.slama26@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Ghada', N'Slama', N'ghada.slama26@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'ghada.slama26@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Ghada', N'Slama', N'ghada.slama26@example.com', N'22525206', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'ghada.slama26@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur DevOps' ORDER BY JobPostingID DESC),
           DATEADD(day, -41, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'ghada.slama26@example.com'),
           1, N'cv_amenyyy.pdf', N'Ghada Slama', N'ghada.slama26@example.com', 22525206,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'ghada.slama26@example.com'),
           56, 58, 57, 54, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'dorra.bensalah27@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Dorra', N'Ben Salah', N'dorra.bensalah27@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'dorra.bensalah27@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Dorra', N'Ben Salah', N'dorra.bensalah27@example.com', N'23684052', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'dorra.bensalah27@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Backend Java' ORDER BY JobPostingID DESC),
           DATEADD(day, -25, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'dorra.bensalah27@example.com'),
           1, N'cv_designer.pdf', N'Dorra Ben Salah', N'dorra.bensalah27@example.com', 23684052,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'dorra.bensalah27@example.com'),
           73, 82, 88, 49, 0, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'cyrine.ouni28@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Cyrine', N'Ouni', N'cyrine.ouni28@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'cyrine.ouni28@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Cyrine', N'Ouni', N'cyrine.ouni28@example.com', N'27402509', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'cyrine.ouni28@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Développeur Frontend React' ORDER BY JobPostingID DESC),
           DATEADD(day, -17, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'cyrine.ouni28@example.com'),
           2, N'cv_testameny.pdf', N'Cyrine Ouni', N'cyrine.ouni28@example.com', 27402509,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'cyrine.ouni28@example.com'),
           83, 93, 79, 78, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'asma.rekik29@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Asma', N'Rekik', N'asma.rekik29@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'asma.rekik29@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Asma', N'Rekik', N'asma.rekik29@example.com', N'21192619', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'asma.rekik29@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Ingénieur Data / IA' ORDER BY JobPostingID DESC),
           DATEADD(day, -49, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'asma.rekik29@example.com'),
           2, N'cv_testtest.pdf', N'Asma Rekik', N'asma.rekik29@example.com', 21192619,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'asma.rekik29@example.com'),
           78, 62, 93, 79, 1, N'Pending';
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'molka.cherif30@example.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat) VALUES (N'Molka', N'Cherif', N'molka.cherif30@example.com', N'candidat.C1970', 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Candidate WHERE Email = N'molka.cherif30@example.com')
    INSERT INTO dbo.Candidate (FirstName, LastName, Email, Phone, CreatedAt) VALUES (N'Molka', N'Cherif', N'molka.cherif30@example.com', N'25476583', GETDATE());
IF NOT EXISTS (SELECT 1 FROM dbo.Application WHERE email = N'molka.cherif30@example.com')
    INSERT INTO dbo.Application (JobPostingID, ApplicationDate, UserId, IdState, CvPath, NameApplication, email, PhoneNumber, CandidateId, FinalScore, HrScore, TechScore, TestScore, IsRecommended, AdminDecision)
    SELECT TOP 1 (SELECT TOP 1 JobPostingID FROM dbo.JobPosting WHERE PositionTitle=N'Administrateur Systèmes & Réseaux' ORDER BY JobPostingID DESC),
           DATEADD(day, -28, GETDATE()),
           (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'molka.cherif30@example.com'),
           3, N'cv_amenygharbi.pdf', N'Molka Cherif', N'molka.cherif30@example.com', 25476583,
           (SELECT TOP 1 CandidateId FROM dbo.Candidate WHERE Email=N'molka.cherif30@example.com'),
           65, 76, 57, 63, 0, N'Approved';
GO
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'leila.rh@tricareer.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat, DepartmentId) VALUES (N'Leila', N'Bouaziz', N'leila.rh@tricareer.com', N'Passer123', 2, 1, 4);
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'karim.rh@tricareer.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat, DepartmentId) VALUES (N'Karim', N'Mejri', N'karim.rh@tricareer.com', N'Passer123', 2, 1, 2);
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'sonia.lead@tricareer.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat, DepartmentId) VALUES (N'Sonia', N'Khalil', N'sonia.lead@tricareer.com', N'Passer123', 3, 1, 2);
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'nabil.lead@tricareer.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat, DepartmentId) VALUES (N'Nabil', N'Hamdi', N'nabil.lead@tricareer.com', N'Passer123', 3, 1, 2);
IF NOT EXISTS (SELECT 1 FROM [User] WHERE Email = N'rania.admin@tricareer.com')
    INSERT INTO [User] (Name, Prename, Email, Password, Role_Id, Etat, DepartmentId) VALUES (N'Rania', N'Admin', N'rania.admin@tricareer.com', N'Passer123', 1, 1, 4);
GO
IF EXISTS (SELECT 1 FROM [User] WHERE Email = N'admin@test.com')
    INSERT INTO dbo.Notifications (Message, Timestamp, IsRead, UserId) SELECT N'Bienvenue sur TriCareer. 12 offres et 30 candidatures sont disponibles.', GETDATE(), 0, (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'admin@test.com');
IF EXISTS (SELECT 1 FROM [User] WHERE Email = N'rh@triweb.com')
    INSERT INTO dbo.Notifications (Message, Timestamp, IsRead, UserId) SELECT N'5 nouvelles candidatures reçues cette semaine.', GETDATE(), 0, (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'rh@triweb.com');
IF EXISTS (SELECT 1 FROM [User] WHERE Email = N'rh@triweb.com')
    INSERT INTO dbo.Notifications (Message, Timestamp, IsRead, UserId) SELECT N'Pensez à planifier les entretiens des candidats présélectionnés.', GETDATE(), 0, (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'rh@triweb.com');
IF EXISTS (SELECT 1 FROM [User] WHERE Email = N'TL@tricareer.com')
    INSERT INTO dbo.Notifications (Message, Timestamp, IsRead, UserId) SELECT N'3 tests techniques sont en attente de correction.', GETDATE(), 0, (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'TL@tricareer.com');
IF EXISTS (SELECT 1 FROM [User] WHERE Email = N'mouna.chokri@gmail.com')
    INSERT INTO dbo.Notifications (Message, Timestamp, IsRead, UserId) SELECT N'Votre candidature a bien été prise en compte. Bonne chance !', GETDATE(), 0, (SELECT TOP 1 User_Id FROM [User] WHERE Email=N'mouna.chokri@gmail.com');
GO
PRINT '[init] Seed réaliste (offres + candidats + staff + notifs) appliqué.';
GO
-- ============================================================================
-- Nettoyage des TESTS de démo (modèles d'examens, questions, sessions) pour
-- partir d'une page "Gestion des tests" propre. Suppression enfant->parent.
-- ============================================================================
USE [TriCareerDb];
GO
DELETE FROM dbo.ReponseDetail;
DELETE FROM dbo.ReponseValue;
DELETE FROM dbo.TestChecklist;
DELETE FROM dbo.[Session];
DELETE FROM dbo.Details_Examan;
DELETE FROM dbo.Answers;
DELETE FROM dbo.Question;
DELETE FROM dbo.Examan;
GO
PRINT '[init] Tests de démo supprimés (page Tests propre).';
GO

-- ============================================================================
-- SEED TESTS RÉALISTES (après le nettoyage des tests de démo)
-- ============================================================================
USE [TriCareerDb];
GO
-- ===== TESTS réalistes (modèles d'examens + questions + réponses) =====
IF NOT EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Développement Web')
    INSERT INTO dbo.Examan (User_id, Description, Titre, active, DateCreation, Format, Duration)
    VALUES ((SELECT TOP 1 User_Id FROM [User] WHERE Email='rh@triweb.com'), N'Quiz généré pour évaluer les compétences.', N'Quiz Développement Web', 1, GETDATE(), N'quiz', 30);
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel langage s''exécute dans le navigateur ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'JavaScript' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'JavaScript', N'radio', N'JavaScript', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Java' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Java', N'radio', N'Java', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Python' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Python', N'radio', N'Python', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'C#' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'C#', N'radio', N'C#', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage s''exécute dans le navigateur ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Que signifie HTML ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'HyperText Markup Language' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'HyperText Markup Language', N'radio', N'HyperText Markup Language', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'High Text Machine Language' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'High Text Machine Language', N'radio', N'High Text Machine Language', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Hyperlink Markup Language' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Hyperlink Markup Language', N'radio', N'Hyperlink Markup Language', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Home Tool Markup Language' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Home Tool Markup Language', N'radio', N'Home Tool Markup Language', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie HTML ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quelle balise crée un lien hypertexte ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'<a>' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'<a>', N'radio', N'<a>', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'<link>' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'<link>', N'radio', N'<link>', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'<href>' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'<href>', N'radio', N'<href>', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'<url>' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'<url>', N'radio', N'<url>', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle balise crée un lien hypertexte ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil versionne le code source ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Git' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Git', N'radio', N'Git', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Docker' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Docker', N'radio', N'Docker', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'NPM' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'NPM', N'radio', N'NPM', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Webpack' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Webpack', N'radio', N'Webpack', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil versionne le code source ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Java Backend')
    INSERT INTO dbo.Examan (User_id, Description, Titre, active, DateCreation, Format, Duration)
    VALUES ((SELECT TOP 1 User_Id FROM [User] WHERE Email='rh@triweb.com'), N'Quiz généré pour évaluer les compétences.', N'Quiz Java Backend', 1, GETDATE(), N'quiz', 30);
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel framework Java est le plus utilisé pour le web ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Spring Boot' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Spring Boot', N'radio', N'Spring Boot', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Django' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Django', N'radio', N'Django', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Laravel' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Laravel', N'radio', N'Laravel', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Express' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Express', N'radio', N'Express', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel framework Java est le plus utilisé pour le web ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel mot-clé définit une classe en Java ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'class' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'class', N'radio', N'class', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'def' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'def', N'radio', N'def', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'function' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'function', N'radio', N'function', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'struct' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'struct', N'radio', N'struct', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel mot-clé définit une classe en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil de build est courant en Java ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Maven' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Maven', N'radio', N'Maven', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'NPM' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'NPM', N'radio', N'NPM', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'pip' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'pip', N'radio', N'pip', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Composer' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Composer', N'radio', N'Composer', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de build est courant en Java ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quelle annotation expose un contrôleur REST Spring ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'@RestController' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'@RestController', N'radio', N'@RestController', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'@Component' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'@Component', N'radio', N'@Component', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'@Entity' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'@Entity', N'radio', N'@Entity', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'@Service' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'@Service', N'radio', N'@Service', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle annotation expose un contrôleur REST Spring ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz DevOps')
    INSERT INTO dbo.Examan (User_id, Description, Titre, active, DateCreation, Format, Duration)
    VALUES ((SELECT TOP 1 User_Id FROM [User] WHERE Email='rh@triweb.com'), N'Quiz généré pour évaluer les compétences.', N'Quiz DevOps', 1, GETDATE(), N'quiz', 30);
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil conteneurise les applications ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Docker' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Docker', N'radio', N'Docker', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Jenkins' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Jenkins', N'radio', N'Jenkins', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Grafana' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Grafana', N'radio', N'Grafana', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Ansible' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Ansible', N'radio', N'Ansible', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil conteneurise les applications ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil orchestre les conteneurs ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Kubernetes' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Kubernetes', N'radio', N'Kubernetes', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Git' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Git', N'radio', N'Git', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Maven' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Maven', N'radio', N'Maven', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Nginx' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Nginx', N'radio', N'Nginx', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil orchestre les conteneurs ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil fait de l''intégration continue ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Jenkins' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Jenkins', N'radio', N'Jenkins', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Photoshop' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Photoshop', N'radio', N'Photoshop', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Figma' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Figma', N'radio', N'Figma', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Postman' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Postman', N'radio', N'Postman', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil fait de l''intégration continue ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Que surveille Prometheus ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Les métriques' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Les métriques', N'radio', N'Les métriques', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Le code source' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Le code source', N'radio', N'Le code source', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Les maquettes' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Les maquettes', N'radio', N'Les maquettes', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Les emails' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Les emails', N'radio', N'Les emails', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que surveille Prometheus ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design')
    INSERT INTO dbo.Examan (User_id, Description, Titre, active, DateCreation, Format, Duration)
    VALUES ((SELECT TOP 1 User_Id FROM [User] WHERE Email='rh@triweb.com'), N'Quiz généré pour évaluer les compétences.', N'Quiz UI/UX Design', 1, GETDATE(), N'quiz', 30);
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil de maquettage est le plus utilisé ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Figma' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Figma', N'radio', N'Figma', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Eclipse' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Eclipse', N'radio', N'Eclipse', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'IntelliJ' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'IntelliJ', N'radio', N'IntelliJ', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Postman' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Postman', N'radio', N'Postman', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil de maquettage est le plus utilisé ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Que signifie UX ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'User Experience' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'User Experience', N'radio', N'User Experience', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'User Extension' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'User Extension', N'radio', N'User Extension', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Ultra Xperience' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Ultra Xperience', N'radio', N'Ultra Xperience', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Unified Example' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Unified Example', N'radio', N'Unified Example', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie UX ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Qu''est-ce qu''un wireframe ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Une maquette basse fidélité' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Une maquette basse fidélité', N'radio', N'Une maquette basse fidélité', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Un langage de programmation' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Un langage de programmation', N'radio', N'Un langage de programmation', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Un serveur web' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Un serveur web', N'radio', N'Un serveur web', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Une base de données' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Une base de données', N'radio', N'Une base de données', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Qu''est-ce qu''un wireframe ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel principe améliore l''accessibilité ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Le contraste des couleurs' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Le contraste des couleurs', N'radio', N'Le contraste des couleurs', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Le nombre de lignes de code' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Le nombre de lignes de code', N'radio', N'Le nombre de lignes de code', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'La taille du fichier' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'La taille du fichier', N'radio', N'La taille du fichier', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Le nombre de serveurs' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Le nombre de serveurs', N'radio', N'Le nombre de serveurs', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel principe améliore l''accessibilité ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Data & IA')
    INSERT INTO dbo.Examan (User_id, Description, Titre, active, DateCreation, Format, Duration)
    VALUES ((SELECT TOP 1 User_Id FROM [User] WHERE Email='rh@triweb.com'), N'Quiz généré pour évaluer les compétences.', N'Quiz Data & IA', 1, GETDATE(), N'quiz', 30);
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel langage est le plus utilisé en data science ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Python' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Python', N'radio', N'Python', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'PHP' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'PHP', N'radio', N'PHP', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'C++' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'C++', N'radio', N'C++', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Ruby' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Ruby', N'radio', N'Ruby', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel langage est le plus utilisé en data science ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quelle bibliothèque sert au machine learning ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'scikit-learn' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'scikit-learn', N'radio', N'scikit-learn', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'React' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'React', N'radio', N'React', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Spring' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Spring', N'radio', N'Spring', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Bootstrap' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Bootstrap', N'radio', N'Bootstrap', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quelle bibliothèque sert au machine learning ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Que signifie NLP ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Natural Language Processing' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Natural Language Processing', N'radio', N'Natural Language Processing', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'New Learning Protocol' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'New Learning Protocol', N'radio', N'New Learning Protocol', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Network Layer Protocol' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Network Layer Protocol', N'radio', N'Network Layer Protocol', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Node Level Parsing' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Node Level Parsing', N'radio', N'Node Level Parsing', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Que signifie NLP ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?')
    INSERT INTO dbo.Question (NameQuestion, [Durée], Barem, active, TimeReponse, Score) VALUES (N'Quel outil manipule des tableaux de données en Python ?', N'2', N'25', 1, 120, N'25');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Pandas' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Pandas', N'radio', N'Pandas', 1, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Express' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Express', N'radio', N'Express', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Laravel' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Laravel', N'radio', N'Laravel', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Answers WHERE Label=N'Symfony' AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?'))
    INSERT INTO dbo.Answers (Label, Type, Name, isCorrect, Id_Question) SELECT N'Symfony', N'radio', N'Symfony', 0, (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?');
IF NOT EXISTS (SELECT 1 FROM dbo.Details_Examan WHERE Id_Examan=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA') AND Id_Question=(SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?'))
    INSERT INTO dbo.Details_Examan (Id_Examan, Id_Question) SELECT (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'), (SELECT TOP 1 Id_Question FROM dbo.Question WHERE NameQuestion=N'Quel outil manipule des tableaux de données en Python ?');
GO
-- Sessions terminées (tests passés avec scores)
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'ahmed.benali1@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Développement Web')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'ahmed.benali1@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 75, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'ahmed.benali1@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'));
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'mohamed.trabelsi2@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Java Backend')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'mohamed.trabelsi2@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 100, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'mohamed.trabelsi2@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Java Backend'));
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'ali.gharbi3@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz DevOps')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'ali.gharbi3@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 50, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'ali.gharbi3@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz DevOps'));
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'youssef.bouazizi4@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'youssef.bouazizi4@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 75, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'youssef.bouazizi4@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz UI/UX Design'));
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'hedi.jelassi5@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Data & IA')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'hedi.jelassi5@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 100, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'hedi.jelassi5@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Data & IA'));
IF EXISTS (SELECT 1 FROM dbo.Application WHERE email=N'sami.khelifi6@example.com') AND EXISTS (SELECT 1 FROM dbo.Examan WHERE Titre=N'Quiz Développement Web')
    INSERT INTO dbo.[Session] (EncryptedSessinId, CreatedAt, ExpiresAt, ExamnId, ApplicationId, SessionState, TimerMinutes, StartedAt, SubmittedAt, AutoSubmitted, Score, TestType, TabSwitchCount)
    SELECT NULL, GETDATE(), DATEADD(day,30,GETDATE()), (SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'), (SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'sami.khelifi6@example.com'), 1, 30, DATEADD(day,-2,GETDATE()), DATEADD(day,-2,GETDATE()), 0, 25, N'quiz', 0
    WHERE NOT EXISTS (SELECT 1 FROM dbo.[Session] s WHERE s.ApplicationId=(SELECT TOP 1 ApplicationID FROM dbo.Application WHERE email=N'sami.khelifi6@example.com') AND s.ExamnId=(SELECT TOP 1 Id_Examan FROM dbo.Examan WHERE Titre=N'Quiz Développement Web'));
GO
PRINT '[init] Seed TESTS (examens + questions + réponses + sessions) appliqué.';
GO