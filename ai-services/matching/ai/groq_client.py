"""Client LLM pour l'analyse de CV (compétences, forces/faiblesses, rapport, quiz).

Par défaut : API OpenAI (ChatGPT). Repli automatique sur Groq si seule GROQ_API_KEY
est fournie. Le contrat public reste `ask_gpt_json(prompt)` afin de ne pas toucher app.py.
Les clés se lisent dans l'environnement (.env) — jamais dans l'image publique.
"""
import os
import json

# --- Configuration des fournisseurs -----------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Groq gardé en repli (compat historique / robustesse)
GROQ_API_KEY = (
    os.getenv("GROQ_API_KEY")
    or os.getenv("GROQ_API_KEY0")
    or os.getenv("GROQ_API_KEY1")
    or os.getenv("GROQ_API_KEY2")
)
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# Fournisseur effectif : OpenAI prioritaire, sinon Groq.
PROVIDER = "openai" if OPENAI_API_KEY else ("groq" if GROQ_API_KEY else None)

# Initialisation paresseuse : ne pas créer le client à l'import (évite de faire
# planter tout le service si la clé/les dépendances posent problème).
_client = None

SYSTEM_INSTRUCTION = (
    "Tu es un expert RH spécialisé en analyse de CV. "
    "Tu DOIS TOUJOURS retourner un JSON valide, rien d'autre. "
    "Aucun texte avant ou après le JSON. Commence par { et termine par }. "
    "Tous les strings entre guillemets doubles. Réponds en français."
)


def _get_client():
    """Crée (une seule fois) le client du fournisseur sélectionné."""
    global _client
    if _client is not None:
        return _client

    if PROVIDER == "openai":
        from openai import OpenAI
        _client = OpenAI(api_key=OPENAI_API_KEY)
    elif PROVIDER == "groq":
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
    else:
        raise RuntimeError(
            "Aucune clé LLM configurée — renseignez OPENAI_API_KEY (recommandé) "
            "ou GROQ_API_KEY dans le fichier .env."
        )
    return _client


def _extract_json(text):
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Aucun JSON dans la réponse du LLM")
    chunk = text[start:end + 1]
    try:
        return json.loads(chunk)
    except json.JSONDecodeError:
        chunk = chunk.replace("\\'", "'")
        return json.loads(chunk)


def ask_gpt_json(prompt):
    """Envoie le prompt au LLM (OpenAI ou Groq) et renvoie un dict JSON parsé."""
    client = _get_client()
    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {"role": "user", "content": prompt},
    ]

    if PROVIDER == "openai":
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.1,
            # Force une réponse JSON valide (supporté par gpt-4o-mini / gpt-4o).
            response_format={"type": "json_object"},
        )
    else:  # groq
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=4096,
        )

    text = response.choices[0].message.content.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return _extract_json(text)


def ask_gpt_text(system_instruction, messages):
    """Chat conversationnel (réponse en texte libre) pour l'assistant d'aide.

    `messages` = liste [{"role": "user"|"assistant", "content": "..."}].
    """
    client = _get_client()
    full = [{"role": "system", "content": system_instruction}] + list(messages)

    if PROVIDER == "openai":
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=full,
            temperature=0.4,
            max_tokens=700,
        )
    else:  # groq
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=full,
            temperature=0.4,
            max_tokens=700,
        )
    return response.choices[0].message.content.strip()
