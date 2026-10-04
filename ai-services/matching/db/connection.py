import pyodbc
from config import DB_CONFIG


def connect_sql_server():
    try:
        conn = pyodbc.connect(
            f"DRIVER={DB_CONFIG['driver']};"
            f"SERVER={DB_CONFIG['server']};"
            f"DATABASE={DB_CONFIG['database']};"
            f"UID={DB_CONFIG['username']};"
            f"PWD={DB_CONFIG['password']};"
            f"TrustServerCertificate=yes;",
            autocommit=False,
        )
        print(" DB Connected")
        return conn
    except Exception as e:
        print(" DB Connection Error:", e)
        return None


# Connexion établie à l'import (peut être None si la DB n'est pas encore prête).
conn = connect_sql_server()


def _is_alive(c):
    if c is None:
        return False
    try:
        c.cursor().execute("SELECT 1")
        return True
    except Exception:
        return False


def get_conn():
    """Renvoie une connexion VIVANTE, en (re)connectant au besoin.

    Corrige le cas où matching-ai a démarré avant que SQL Server soit prêt
    (conn=None), ou si la connexion a été perdue après un redémarrage de la base
    (sinon get_job/get_application renvoyaient None -> offre "vide" -> le CV était
    comparé à lui-même -> score de matching toujours à 100%).
    """
    global conn
    if not _is_alive(conn):
        conn = connect_sql_server()
    return conn
