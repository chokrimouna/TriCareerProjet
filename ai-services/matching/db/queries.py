from db.connection import get_conn


def get_job(job_id):
    conn = get_conn()
    if conn is None:
        return None

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM JobPosting WHERE JobPostingID=?", (job_id,))
    return cursor.fetchone()


def get_applications(job_id):
    conn = get_conn()
    if conn is None:
        return []

    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.*, c.FirstName, c.LastName
        FROM Application a
        JOIN Candidate c ON a.CandidateId = c.CandidateId
        WHERE a.JobPostingID=?
    """, (job_id,))
    return cursor.fetchall()


def get_application(application_id):
    """Une candidature par son Id (pour l'analyse IA)."""
    conn = get_conn()
    if conn is None:
        return None

    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM Application WHERE ApplicationID=?",
        (application_id,),
    )
    return cursor.fetchone()
