# =====================================================================
# Micro-service IA "matching" (FastAPI) — calcule le score CV/offre,
# remplit la table MatchCV et renvoie le classement des candidats.
# =====================================================================
# Debian 12 (bookworm) épinglé : compatible avec le dépôt msodbcsql18 debian/12
# (python:3.11-slim suit désormais Debian 13 "trixie" dont apt rejette la clé SHA1 de Microsoft)
FROM python:3.11-slim-bookworm
WORKDIR /app

# Outils système + driver ODBC 18 (pour pyodbc)
# Fix "Hash Sum mismatch" (réseau/proxy qui corrompt les téléchargements apt) :
# on désactive le pipelining et le cache HTTP d'apt.
RUN printf 'Acquire::http::Pipeline-Depth "0";\nAcquire::http::No-Cache "true";\nAcquire::BrokenProxy "true";\nAcquire::Retries "5";\nAcquire::By-Hash "no";\n' > /etc/apt/apt.conf.d/99fixbadproxy \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       curl gnupg2 apt-transport-https ca-certificates build-essential \
    && curl -sSL -O https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python (torch CPU séparément pour une image plus légère)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Pré-téléchargement du modèle d'embeddings (évite un téléchargement au 1er appel)
ENV HF_HOME=/opt/hf-cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Code du service
COPY . ./

ENV CV_FOLDER=/data/Cv
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
