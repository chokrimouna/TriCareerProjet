# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Query
import re
import json
import os
import unicodedata
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import List, Dict

app = FastAPI(title="TriCareer AI CV Analysis Service")

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

# Load semantic model ONCE at startup
print("Loading SentenceTransformer model...")
semantic_model = SentenceTransformer('distiluse-base-multilingual-cased-v2')
print("Model loaded successfully.")

# Helper to remove accents and normalize text
def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize('NFD', text)
    text = "".join([c for c in text if unicodedata.category(c) != 'Mn'])
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_cv_skills(text: str) -> List[str]:
    clean_text = normalize_text(text)
    found_skills = set()
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
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, clean_text):
            found_skills.add(keyword)
    return sorted(list(found_skills))

import PyPDF2
def extract_text_from_pdf(pdf_path: str) -> str:
    if not os.path.exists(pdf_path):
        # Check relative to Resources/Cv if needed
        alt_path = os.path.join(os.getcwd(), "Resources", "Cv", os.path.basename(pdf_path))
        if os.path.exists(alt_path):
            pdf_path = alt_path
        else:
            raise FileNotFoundError(f"CV file not found: {pdf_path}")
    
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/analyze")
async def analyze(cv_path: str, job_id: int):
    session = Session()
    try:
        job = session.query(JobPosting).filter(JobPosting.JobPostingId == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job Posting {job_id} not found")
        
        try:
            cv_text = extract_text_from_pdf(cv_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF error: {str(e)}")

        # 1. Matching des compétences (Skill Match)
        cv_skills = set(extract_cv_skills(cv_text))
        job_skills_text = f"{job.Skills} {job.Requirements}"
        job_skills = set(extract_cv_skills(job_skills_text))
        
        matched_skills = cv_skills & job_skills
        skill_score = len(matched_skills) / max(len(job_skills), 1)

        # 2. Semantic similarity
        cv_skills_text = " ".join(sorted(cv_skills)) if cv_skills else "general"
        job_skills_text = " ".join(sorted(job_skills)) if job_skills else "general"

        cv_embedding = semantic_model.encode([cv_skills_text], convert_to_numpy=True)
        job_embedding = semantic_model.encode([job_skills_text], convert_to_numpy=True)
        semantic_score = float(cosine_similarity(cv_embedding, job_embedding)[0][0])

        # 3. Final score — 80% skills, 20% semantic
        total_score = (0.80 * skill_score + 0.20 * semantic_score) * 100

        return {
            "job_id": job_id,
            "score": round(total_score, 2),
            "matched_skills": list(matched_skills),
            "status": "Accepted" if total_score >= 75 else "Rejected"
        }
    finally:
        session.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
