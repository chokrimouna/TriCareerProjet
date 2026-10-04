from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db.queries import get_job, get_applications, get_application
from db.connection import get_conn

from utils.cv_loader import load_cv

from ai.preprocess import preprocess_text
from ai.embedding_model import get_embedding
from ai.scorer import calculate_similarity
from ai.groq_client import ask_gpt_json, ask_gpt_text
from ai.prompts import ANALYZE_FULL_PROMPT, RAPPORT_PROMPT, QUIZ_PROMPT


app = FastAPI(
    title="CV Matching API",
    description="AI API for CV and Job Matching",
    version="1.0.0"
)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():

    return {
        "message": "CV Matching API Running Successfully"
    }


@app.get("/match/{job_id}")
def match_job(job_id: int):


    job = get_job(job_id)

    if job is None:
        return {
            "error": "Job not found"
        }


    job_skills = preprocess_text(job.Skills)


    job_skills_list = [
        skill.strip()
        for skill in job_skills.split(",")
        if skill.strip()
    ]

    # Embedding basé sur la description COMPLÈTE de l'offre (titre + compétences +
    # exigences + missions + description) plutôt que la seule liste de compétences :
    # le score de matching est bien plus représentatif (cohérent avec /analyze).
    job_parts = []
    for attr in ("PositionTitle", "Skills", "Requirements", "Missions", "Description"):
        value = getattr(job, attr, None)
        if value:
            job_parts.append(str(value))
    job_full_text = preprocess_text("\n".join(job_parts)) if job_parts else job_skills
    job_embedding = get_embedding(job_full_text)


    applications = get_applications(job_id)

    results = []

    conn = get_conn()
    cursor = conn.cursor()

    for app_data in applications:

        application_id = app_data.ApplicationID
        candidate_id = app_data.CandidateId
        job_posting_id = app_data.JobPostingID

        print(f"\nMatching Candidate {candidate_id}...")


        cv_file_name = app_data.CvPath


        cv_file_name = cv_file_name.replace(".pdf", "")

  
        cv_text = load_cv(cv_file_name)

        if cv_text == "":
            continue


        cv_text = preprocess_text(cv_text)


        found_skills = []

        for skill in job_skills_list:

            if skill in cv_text:
                found_skills.append(skill)


        found_skills_text = ", ".join(found_skills)


        # Score DÉTERMINISTE et unifié (même formule que /analyze et /analyze-cv)
        score = compute_match_score(job_full_text, job_skills_list, cv_text)



        cursor.execute("""
            SELECT Id
            FROM MatchCV
            WHERE ApplicationID = ?
        """, (application_id,))

        existing_match = cursor.fetchone()


        if existing_match:

            cursor.execute("""
                UPDATE MatchCV
                SET
                    JobPostingID = ?,
                    CandidateId = ?,
                    Skills = ?,
                    Matching_Score = ?
                WHERE ApplicationID = ?
            """,
            (
                job_posting_id,
                candidate_id,
                found_skills_text,
                score,
                application_id
            ))

            print("MatchCV Updated")


        else:

            cursor.execute("""
                INSERT INTO MatchCV
                (
                    ApplicationID,
                    JobPostingID,
                    CandidateId,
                    Skills,
                    Matching_Score
                )
                VALUES (?, ?, ?, ?, ?)
            """,
            (
                application_id,
                job_posting_id,
                candidate_id,
                found_skills_text,
                score
            ))

            print("MatchCV Inserted")

        conn.commit()


        results.append({
            "application_id": application_id,
            "candidate_id": candidate_id,
            "job_posting_id": job_posting_id,
            "matching_score": score,
            "skills_found": found_skills
        })


    results = sorted(
        results,
        key=lambda x: x["matching_score"],
        reverse=True
    )

    return {
        "job_id": job_id,
        "total_candidates": len(results),
        "results": results
    }


# =====================================================================
# Score de matching CV / offre — DÉTERMINISTE et UNIFIÉ (utilisé partout).
# Même CV + même offre => toujours EXACTEMENT le même score.
# Formule = 60% similarité sémantique (embeddings) + 40% recouvrement de
# compétences, avec un rehaussement doux pour des pourcentages plus parlants.
# Aucun composant aléatoire (pas de LLM) => résultat reproductible.
# =====================================================================

def compute_match_score(job_text, job_skills_list, cv_text):
    cv_prep = preprocess_text(cv_text or "")
    if not cv_prep:
        return 0.0

    ref = (job_text or "").strip()
    if not ref and job_skills_list:
        ref = ", ".join(job_skills_list)
    if not ref:
        return 0.0  # pas de données d'offre -> matching non calculable

    # 1) Similarité sémantique (embeddings) : 0-100, déterministe
    try:
        emb_sim = calculate_similarity(get_embedding(ref), get_embedding(cv_prep))
    except Exception:
        emb_sim = 0.0

    # 2) Recouvrement de compétences : part des compétences de l'offre présentes
    #    dans le CV (0-100), déterministe
    skill_ratio = 0.0
    if job_skills_list:
        cv_low = cv_prep.lower()
        found = sum(1 for s in job_skills_list if s and s.strip().lower() in cv_low)
        skill_ratio = (found / len(job_skills_list)) * 100.0

    # 3) Combinaison pondérée + rehaussement doux (les cosinus bruts sont bas)
    score = 0.6 * emb_sim + 0.4 * skill_ratio
    score = min(100.0, score * 1.25)
    return round(score, 2)


# =====================================================================
# US12 / US19 / US20 : analyse IA (forces/faiblesses, compétences
# manquantes) et rapport d'évaluation, basés sur Groq.
# =====================================================================

class AnalyzeRequest(BaseModel):
    application_id: int


def _load_cv_and_job(application_id):
    """Charge le texte du CV et le texte de l'offre pour une candidature."""
    app_row = get_application(application_id)
    if app_row is None:
        return None, None, None, "Candidature introuvable"

    cv_file_name = (getattr(app_row, "CvPath", None) or "").replace(".pdf", "")
    cv_text = load_cv(cv_file_name) if cv_file_name else ""
    if not cv_text:
        return None, None, None, "CV introuvable ou illisible"

    job_text = ""
    job_skills_list = []
    job = get_job(getattr(app_row, "JobPostingID", None))
    if job is not None:
        parts = []
        for attr in ("PositionTitle", "Skills", "Requirements", "Description"):
            value = getattr(job, attr, None)
            if value:
                parts.append(str(value))
        job_text = "\n".join(parts)
        skills_raw = preprocess_text(getattr(job, "Skills", "") or "")
        job_skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]

    return cv_text, job_text, job_skills_list, None


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    cv_text, job_text, job_skills_list, err = _load_cv_and_job(req.application_id)
    if err:
        return {"error": err}

    prompt = ANALYZE_FULL_PROMPT.format(
        cv_text=cv_text[:8000],
        job_text=(job_text or "(non précisé)")[:2000],
    )
    data = ask_gpt_json(prompt)

    # Score de matching DÉTERMINISTE et unifié (même CV+offre => même score partout)
    score = compute_match_score(job_text, job_skills_list, cv_text)

    return {
        "application_id": req.application_id,
        "matching_score": score,
        "skills": data.get("skills", []),
        "missing_skills": data.get("missing_skills", []),
        "strengths": data.get("strengths", []),
        "weaknesses": data.get("weaknesses", []),
        "recommendations": data.get("recommendations", []),
        "summary": data.get("summary", ""),
    }


@app.post("/report")
def report(req: AnalyzeRequest):
    cv_text, _job_text, _job_skills, err = _load_cv_and_job(req.application_id)
    if err:
        return {"error": err}

    prompt = RAPPORT_PROMPT.format(cv_text=cv_text[:8000])
    data = ask_gpt_json(prompt)
    return {"application_id": req.application_id, "report": data}


# =====================================================================
# Analyse d'un CV UPLOADÉ (fichier déjà sauvegardé dans le volume) contre
# une offre : score de matching (embeddings) + analyse Groq. Utilisé par
# l'écran "Analyse IA des CV" (glisser-déposer).
# =====================================================================

class AnalyzeCvFileRequest(BaseModel):
    cv_filename: str
    job_id: int


@app.post("/analyze-cv")
def analyze_cv_file(req: AnalyzeCvFileRequest):
    cv_file_name = (req.cv_filename or "").replace(".pdf", "")
    cv_text = load_cv(cv_file_name) if cv_file_name else ""
    if not cv_text:
        return {"error": "CV introuvable ou illisible"}

    # Offre + compétences requises
    job = get_job(req.job_id)
    job_text = ""
    job_skills_list = []
    if job is not None:
        job_skills = preprocess_text(getattr(job, "Skills", "") or "")
        job_skills_list = [s.strip() for s in job_skills.split(",") if s.strip()]
        parts = []
        for attr in ("PositionTitle", "Skills", "Requirements", "Description"):
            v = getattr(job, attr, None)
            if v:
                parts.append(str(v))
        job_text = "\n".join(parts)

    # Score de matching DÉTERMINISTE et unifié (même formule que /analyze) :
    # même CV + même offre => toujours exactement le même score.
    cv_prep = preprocess_text(cv_text)
    found_skills = [s for s in job_skills_list if s in cv_prep]
    score = compute_match_score(job_text, job_skills_list, cv_text)

    # Analyse Groq (compétences, forces, faiblesses, résumé) — best effort
    analysis = {}
    try:
        prompt = ANALYZE_FULL_PROMPT.format(
            cv_text=cv_text[:8000],
            job_text=(job_text or "(non précisé)")[:2000],
        )
        analysis = ask_gpt_json(prompt)
    except Exception:
        analysis = {}

    return {
        "matching_score": score,
        "skills": (analysis.get("skills") or found_skills),
        "missing_skills": analysis.get("missing_skills", []),
        "strengths": analysis.get("strengths", []),
        "weaknesses": analysis.get("weaknesses", []),
        "summary": analysis.get("summary", ""),
    }


# =====================================================================
# Génération d'un QUIZ (QCM) à partir des compétences détectées d'un CV.
# Utilisé par la page "Gestion des tests" (génération automatique de quiz).
# =====================================================================

class GenerateQuizRequest(BaseModel):
    skills: list[str] = []
    cv_filename: str | None = None
    job_id: int | None = None
    num_questions: int = 5


@app.post("/generate-quiz")
def generate_quiz(req: GenerateQuizRequest):
    skills = [s.strip() for s in (req.skills or []) if s and s.strip()]

    # Si aucune compétence fournie, on les extrait du CV via l'analyse IA.
    if not skills and req.cv_filename:
        cv_file_name = (req.cv_filename or "").replace(".pdf", "")
        cv_text = load_cv(cv_file_name) if cv_file_name else ""
        if cv_text:
            job_text = ""
            if req.job_id:
                job = get_job(req.job_id)
                if job is not None:
                    parts = []
                    for attr in ("PositionTitle", "Skills", "Requirements", "Description"):
                        v = getattr(job, attr, None)
                        if v:
                            parts.append(str(v))
                    job_text = "\n".join(parts)
            try:
                data = ask_gpt_json(ANALYZE_FULL_PROMPT.format(
                    cv_text=cv_text[:8000],
                    job_text=(job_text or "(non précisé)")[:2000],
                ))
                skills = [s for s in (data.get("skills") or []) if s]
            except Exception:
                skills = []

    if not skills:
        return {"error": "Aucune compétence fournie ou détectée pour générer le quiz."}

    n = max(1, min(int(req.num_questions or 5), 15))
    try:
        prompt = QUIZ_PROMPT.format(skills=", ".join(skills[:20]), n=n)
        data = ask_gpt_json(prompt)
    except Exception as e:
        return {"error": f"Échec de génération du quiz : {e}"}

    raw = data.get("questions", []) if isinstance(data, dict) else []
    questions = []
    for q in raw:
        opts = q.get("options") or []
        if not q.get("question") or len(opts) < 2:
            continue
        try:
            ci = int(q.get("correct_index", 0))
        except Exception:
            ci = 0
        ci = max(0, min(ci, len(opts) - 1))
        questions.append({
            "question": str(q.get("question")),
            "skill": str(q.get("skill", "")),
            "options": [str(o) for o in opts],
            "correct_index": ci,
        })

    return {"skills": skills, "questions": questions}

# =====================================================================
# Assistant d'aide conversationnel (chatbot) — une "bulle" par rôle.
# Utilise la même API OpenAI (ChatGPT). Système adapté au rôle de l'utilisateur.
# =====================================================================

ROLE_SYSTEM_PROMPTS = {
    "admin": (
        "Tu es l'assistant IA de TriCareer pour un ADMINISTRATEUR. "
        "Tu aides à administrer la plateforme : gestion des utilisateurs et des rôles, "
        "des départements, des offres d'emploi (Postes), suivi global du recrutement, "
        "statistiques et bonnes pratiques. Réponds en français, de façon claire et concise, "
        "avec des étapes concrètes quand c'est utile."
    ),
    "rh": (
        "Tu es l'assistant IA de TriCareer pour un RECRUTEUR (RH). "
        "Tu aides sur la stratégie RH : rédaction d'offres, sourcing, présélection et analyse "
        "de CV, matching candidat/offre, organisation des tests et entretiens, décision finale, "
        "et communication candidat. Réponds en français, concis et actionnable."
    ),
    "teamleader": (
        "Tu es l'assistant IA de TriCareer pour un TEAM LEADER technique. "
        "Tu aides sur l'évaluation technique des candidats, la création de tests/quiz, "
        "les entretiens techniques et le classement des profils. Réponds en français, concis."
    ),
    "candidate": (
        "Tu es l'assistant IA de TriCareer pour un CANDIDAT. "
        "Tu aides le candidat à postuler, préparer et passer ses tests/quiz, comprendre son score, "
        "préparer ses entretiens et améliorer son CV. Sois encourageant, clair et concis, en français."
    ),
}


def _normalize_role(role):
    r = (role or "").strip().lower()
    if r in ("hr",):
        return "rh"
    if r in ("team_leader", "team-leader", "tl"):
        return "teamleader"
    if r in ("admin", "rh", "teamleader", "candidate"):
        return r
    return "candidate"


class ChatMessage(BaseModel):
    role: str = "user"
    content: str = ""


class ChatRequest(BaseModel):
    role: str = "candidate"
    messages: list[ChatMessage] = []
    page: str | None = None


@app.post("/chat")
def chat(req: ChatRequest):
    role = _normalize_role(req.role)
    system = ROLE_SYSTEM_PROMPTS.get(role, ROLE_SYSTEM_PROMPTS["candidate"])
    if req.page:
        system += f"\nL'utilisateur est actuellement sur la page : {req.page}."

    msgs = [
        {"role": ("assistant" if m.role == "assistant" else "user"), "content": (m.content or "").strip()}
        for m in (req.messages or [])
        if (m.content or "").strip()
    ][-10:]

    if not msgs:
        return {"reply": "Bonjour ! Je suis votre assistant TriCareer. Comment puis-je vous aider ?"}

    try:
        reply = ask_gpt_text(system, msgs)
    except Exception as e:
        return {"error": f"Assistant IA indisponible : {e}"}
    return {"reply": reply}
