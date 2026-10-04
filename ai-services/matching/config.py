import os

# Connexion SQL Server — paramétrable par variables d'environnement (Docker).
# Valeurs par défaut = configuration du docker-compose TriCareer.
DB_CONFIG = {
    "driver": os.getenv("DB_DRIVER", "{ODBC Driver 18 for SQL Server}"),
    "server": os.getenv("DB_SERVER", "sqlserver,1433"),
    "database": os.getenv("DB_DATABASE", "TriCareerDb"),
    "username": os.getenv("DB_USER", "sa"),
    "password": os.getenv("DB_PASSWORD", "YourStrong!Passw0rd"),
}

# Dossier contenant les CV (volume partagé avec l'API .NET : Resources/Cv)
CV_FOLDER = os.getenv("CV_FOLDER", "/data/Cv")
