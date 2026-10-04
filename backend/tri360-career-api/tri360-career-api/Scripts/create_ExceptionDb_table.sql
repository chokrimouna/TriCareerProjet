IF OBJECT_ID(N'dbo.ExceptionDb', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExceptionDb
    (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Message] NVARCHAR(MAX) NULL,
        [Stacktrace] NVARCHAR(MAX) NULL,
        [Data] NVARCHAR(MAX) NULL,
        [Hresult] NVARCHAR(50) NULL,
        [NameService] NVARCHAR(255) NULL,
        [FunctionName] NVARCHAR(255) NULL,
        [InPlaintext] NVARCHAR(MAX) NULL,
        [CreateDate] DATETIME2 NOT NULL
    );
END;
