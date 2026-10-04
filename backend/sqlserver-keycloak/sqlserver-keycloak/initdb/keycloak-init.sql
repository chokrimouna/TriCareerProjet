USE master;
GO
 
-- 1. Create the database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'keycloak')
BEGIN
    CREATE DATABASE keycloak;
END
GO
 
-- 2. Create the Login at the Server level
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'keycloak_user')
BEGIN
    CREATE LOGIN [keycloak_user] WITH PASSWORD = 'Keycloak!Passw0rd', DEFAULT_DATABASE = [keycloak];
END
GO
 
-- 3. Map the Login to a User inside the Keycloak database
USE keycloak;
GO
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'keycloak_user')
BEGIN
    CREATE USER [keycloak_user] FOR LOGIN [keycloak_user];
    -- Give permissions to create tables/schema
    EXEC sp_addrolemember 'db_owner', 'keycloak_user';
END
GO