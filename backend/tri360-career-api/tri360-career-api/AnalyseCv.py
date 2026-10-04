# -*- coding: utf-8 -*-

import re
import json
import os
import sys
import PyPDF2
import unicodedata
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import List, Dict

# Configuration de la base de données (SQL Server)
# La variable d'environnement PY_DATABASE_URL est utilisée en priorité (Docker),
# avec repli sur la valeur locale par défaut.
DATABASE_URL = os.environ.get(
    "PY_DATABASE_URL",
    "mssql+pyodbc://sa:YourStrong!Passw0rd@localhost:15433/TriCareerDb?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes",
)

Base = declarative_base()

class JobPosting(Base):
    __tablename__ = 'JobPosting'
    JobPostingId = Column(Integer, primary_key=True)
    PositionTitle = Column(String(50))
    Description = Column(Text)
    Requirements = Column(Text)
    Missions = Column(Text)
    Skills = Column(Text)
    Experience = Column(Text)
    Location = Column(String(50))

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Load semantic model once at startup
semantic_model = SentenceTransformer('distiluse-base-multilingual-cased-v2')

# 1. Fonction pour charger une offre spécifique depuis SQL Server
def load_job_posting(job_id: int) -> Dict:
    session = Session()
    try:
        job = session.query(JobPosting).filter(JobPosting.JobPostingId == job_id).first()
        if not job:
            return None
        return {
            "id": job.JobPostingId,
            "titre": job.PositionTitle,
            "description": job.Description or "",
            "requirements": job.Requirements or "",
            "missions": job.Missions or "",
            "skills": job.Skills or "",
            "experience": job.Experience or ""
        }
    finally:
        session.close()

# 2. Fonctions pour l'extraction et le matching
def extract_text_from_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        # Essayer le chemin relatif si absolu échoue
        if not os.path.isabs(pdf_path):
             pdf_path = os.path.join(os.getcwd(), pdf_path)
        
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"Le fichier CV {pdf_path} n'existe pas")
    
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Erreur lors de la lecture du PDF: {e}")
        return ""
    return text

# Helper to remove accents and normalize text
def normalize_text(text: str) -> str:
    if not text:
        return ""
    # Normalize to NFD to separate accents from characters
    text = unicodedata.normalize('NFD', text)
    # Remove accents
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    # Lowercase and remove non-alphanumeric chars (keep spaces)
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_cv_skills(text: str) -> List[str]:
    # Normalize input text
    clean_text = normalize_text(text)
    
    found_skills = set()
    
    # Standardized list of keywords (should be all lowercase, no accents)
    technical_keywords = [
        "python", "javascript", "java", "c++", "c#", "php", "ruby", "swift", "kotlin", "typescript",
        "react", "angular", "vue", "node", "express", "django", "flask", "laravel", "symfony",
        "sql", "mysql", "postgresql", "mongodb", "oracle", "sql server", "nosql", "firebase",
        "aws", "azure", "google cloud", "docker", "kubernetes", "jenkins", "git", "github", "gitlab",
        "linux", "windows", "scrum", "agile", "devops", "cicd", "rest api", "graphql", "microservices",
        "machine learning", "deep learning", "ia", "ai", "data science", "big data", "hadoop", "spark",
        "html", "css", "sass", "bootstrap", "tailwind", "figma", "adobe", "photoshop", "illustrator",
        "ux", "ui", "design", "marketing", "digital", "seo", "communication", "management", "leadership",
        "planning", "analytique", "flutter", "dart", "react native", "ionic", "android", "ios",
        "gestion de projet", "social media", "canva", "indesign"
    ]
    
    for keyword in technical_keywords:
        # Match using word boundaries to avoid partial matches (e.g., 'java' in 'javascript')
        # We use re.escape in case keywords have special chars like C++
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, clean_text):
            found_skills.add(keyword)
            
    return sorted(list(found_skills))

def match_cv_to_job(cv_path: str, job_id: int) -> Dict:
    job = load_job_posting(job_id)
    if not job:
        return {"error": f"Job Posting {job_id} non trouvé"}
    
    cv_text = extract_text_from_pdf(cv_path)
    if not cv_text:
        return {"error": "Impossible d'extraire le texte du CV"}
    
    print(f"Debug: {len(cv_text)} caracteres extraits du CV")
    
    # 1. Matching des compétences (Skill Match)
    cv_skills = set(extract_cv_skills(cv_text))
    job_skills_text = f"{job['skills']} {job['requirements']}"
    job_skills = set(extract_cv_skills(job_skills_text))
    
    print(f"Debug: Competences CV: {cv_skills}")
    print(f"Debug: Competences Job: {job_skills}")
    
    matched_skills = cv_skills & job_skills
    skill_score = len(matched_skills) / max(len(job_skills), 1)

    print(f"Debug: {len(matched_skills)}/{len(job_skills)} competences matchees -> skill_score={skill_score:.2f}")

    # 2. Semantic similarity — compare skills-to-skills (not full CV text vs description)
    # This gives a meaningful score since both sides are the same type of content (keywords)
    cv_skills_text = " ".join(sorted(cv_skills)) if cv_skills else "general"
    job_skills_text = " ".join(sorted(job_skills)) if job_skills else "general"

    print(f"Debug: CV Skills String for AI: '{cv_skills_text}'")
    print(f"Debug: Job Skills String for AI: '{job_skills_text}'")

    cv_embedding = semantic_model.encode([cv_skills_text], convert_to_numpy=True)
    job_embedding = semantic_model.encode([job_skills_text], convert_to_numpy=True)
    semantic_score = float(cosine_similarity(cv_embedding, job_embedding)[0][0])

    print(f"Debug: semantic_score_raw={semantic_score:.6f}")

    # 3. Final score — 80% skills, 20% semantic
    total_score = (0.80 * skill_score + 0.20 * semantic_score) * 100

    print(f"Debug: total_score={total_score:.2f}%")

    return {
        "job_id": job_id,
        "score": round(total_score, 2),
        "matched_skills": list(matched_skills),
        "status": "Accepted" if total_score >= 75 else "Rejected"
    }

if __name__ == "__main__":
    # Usage: python AnalyseCv.py <cv_path> <job_id>
    if len(sys.argv) < 3:
        # Mode démo si pas d'arguments
        print(json.dumps({"error": "Usage: python AnalyseCv.py <cv_path> <job_id>"}))
    else:
        cv_path = sys.argv[1]
        try:
            job_id = int(sys.argv[2])
            result = match_cv_to_job(cv_path, job_id)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
