"""Prompts d'analyse de CV (repris/adaptés de code-ia IA/IA/services/prompts.py)."""

# Analyse complète en un seul appel : compétences, forces, faiblesses,
# compétences manquantes (vs offre), recommandations, résumé. (US12 / US19 / US10)
ANALYZE_FULL_PROMPT = """Tu es un expert RH. Analyse ce CV par rapport à l'offre d'emploi et retourne UNIQUEMENT un JSON valide.

IMPORTANT:
- Réponds UNIQUEMENT avec du JSON valide, PAS de texte avant ou après
- Commence par {{ et termine par }}
- Tous les strings entre guillemets doubles, les tableaux au format [ ]
- Échappe correctement les caractères spéciaux, pas d'apostrophes mal échappées

Retourne ce JSON exact (remplis les valeurs en français) :

{{
    "skills": ["compétence1", "compétence2"],
    "missing_skills": ["compétence requise absente du CV"],
    "strengths": ["point fort 1", "point fort 2"],
    "weaknesses": ["point faible 1", "point faible 2"],
    "recommendations": ["recommandation 1", "recommandation 2"],
    "summary": "résumé global du profil du candidat"
}}

CV à analyser :
{cv_text}

OFFRE D'EMPLOI (compétences/exigences requises) :
{job_text}

Réponds UNIQUEMENT avec le JSON valide :"""


# Rapport d'évaluation structuré (US20). Repris de RAPPORT_PROMPT de code-ia.
RAPPORT_PROMPT = """Tu es un expert RH spécialisé en évaluation de candidats. Génère un rapport d'évaluation pour ce CV et retourne UNIQUEMENT un JSON valide.

IMPORTANT:
- Réponds UNIQUEMENT avec du JSON valide, PAS de texte avant ou après
- Commence par {{ et termine par }}
- Tous les strings entre guillemets doubles, les tableaux au format [ ]
- Échappe correctement les caractères spéciaux, pas d'apostrophes mal échappées

Retourne ce JSON exact (remplis les valeurs) :

{{
    "rapport_titre": "Rapport d evaluation du candidat",
    "resume_general": "Résumé global de l évaluation",
    "competences_techniques": {{ "note": 8, "details": "Évaluation des compétences techniques" }},
    "experience_professionnelle": {{ "note": 7, "details": "Évaluation de l expérience" }},
    "soft_skills": {{ "note": 8, "details": "Évaluation des compétences humaines" }},
    "points_forts": ["Point fort 1", "Point fort 2"],
    "points_faibles": ["Point faible 1", "Point faible 2"],
    "recommandations": ["Recommandation 1", "Recommandation 2"],
    "verdict_global": "Profil intéressant",
    "score_general": 77
}}

CV à évaluer :
{cv_text}

Réponds UNIQUEMENT avec le JSON valide :"""


# Génération d'un quiz (QCM) à partir des compétences détectées d'un CV.
QUIZ_PROMPT = """Tu es un expert RH et technique. Génère un QUIZ d'évaluation (QCM) pour tester
un candidat sur les compétences suivantes, et retourne UNIQUEMENT un JSON valide.

IMPORTANT:
- Réponds UNIQUEMENT avec du JSON valide, PAS de texte avant ou après
- Commence par {{ et termine par }}
- Génère {n} questions au total, réparties sur les compétences listées
- Chaque question a EXACTEMENT 4 options et une seule bonne réponse
- "correct_index" est l'indice (0 à 3) de la bonne réponse dans "options"
- Questions et options en français, niveau professionnel, claires et non ambiguës

Retourne ce JSON exact :

{{
    "questions": [
        {{
            "question": "énoncé de la question",
            "skill": "compétence testée",
            "options": ["option A", "option B", "option C", "option D"],
            "correct_index": 0
        }}
    ]
}}

COMPÉTENCES À TESTER :
{skills}

Réponds UNIQUEMENT avec le JSON valide :"""
