# =====================================================================
# API TriCareer : ASP.NET Core (.NET 7) + service Python d'analyse de CV
# Construction en plusieurs étapes :
#   1) build  : compile et publie l'application .NET
#   2) runtime: .NET runtime + Python + driver ODBC 18 + modèle ML
# =====================================================================

# --------- ÉTAPE 1 : build .NET ---------
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

# Restauration des paquets NuGet (mise en cache si le csproj ne change pas)
COPY Quizback.csproj ./
RUN dotnet restore Quizback.csproj

# Copie du reste du code et publication
COPY . ./
RUN dotnet publish Quizback.csproj -c Release -o /app/publish /p:UseAppHost=false


# --------- ÉTAPE 2 : image finale ---------
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app

# 2.1 Outils système + Python + driver ODBC 18 (pour pyodbc)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl gnupg2 apt-transport-https ca-certificates \
       python3 python3-venv python3-dev build-essential \
    && curl -sSL -O https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# 2.2 Environnement virtuel Python (fournit la commande "python" sur le PATH,
#     c'est elle que l'API .NET appelle pour lancer AnalyseCv.py)
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# 2.3 Dépendances Python (torch CPU séparément pour une image plus légère)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# 2.4 Pré-téléchargement du modèle ML pour éviter un téléchargement au 1er usage
ENV HF_HOME=/opt/hf-cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('distiluse-base-multilingual-cased-v2')"

# 2.5 Application .NET publiée + scripts Python + dossiers de ressources
COPY --from=build /app/publish ./
COPY AnalyseCv.py ai_service.py ./
RUN mkdir -p Resources/Cv Resources/Files
# CV de démonstration : peuplent le volume api_resources sur une installation neuve
# (Décision Finale / Classement IA / téléchargement CV fonctionnent d'emblée).
COPY seed-cv/*.pdf ./Resources/Cv/

# 2.6 Configuration réseau
ENV ASPNETCORE_URLS=http://+:5144
EXPOSE 5144

ENTRYPOINT ["dotnet", "QuizbackServer.dll"]
