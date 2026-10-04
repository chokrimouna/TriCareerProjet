# =====================================================================
# Image SQL Server 2022 personnalisée pour TriCareer
# - Embarque les sauvegardes (.bak) directement dans l'image
# - Restaure automatiquement TriCareerDb + keycloak au premier démarrage
# - Crée le login keycloak_user attendu par Keycloak
# =====================================================================
FROM mcr.microsoft.com/mssql/server:2022-latest

# --- On passe root le temps d'installer les outils sqlcmd ---
USER root

# Installe sqlcmd (mssql-tools18) pour pouvoir lancer le script de restauration
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gnupg2 apt-transport-https ca-certificates \
    && curl -sSL -O https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends mssql-tools18 unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="${PATH}:/opt/mssql-tools18/bin"

# --- Copie des sauvegardes et des scripts dans l'image ---
RUN mkdir -p /var/opt/mssql/backup /usr/src/app
# tricareerdata.bak = sauvegarde la plus récente (schéma à jour attendu par le code)
COPY tricareerdata.bak /var/opt/mssql/backup/TriCareer.bak
COPY keycloak.bak      /var/opt/mssql/backup/keycloak.bak
COPY init.sql        /usr/src/app/init.sql
COPY entrypoint.sh   /usr/src/app/entrypoint.sh

RUN chmod +x /usr/src/app/entrypoint.sh \
    && chown -R mssql:root /var/opt/mssql/backup /usr/src/app

# --- On repasse sur l'utilisateur non-privilégié officiel ---
USER mssql

# entrypoint.sh démarre SQL Server PUIS lance la restauration une seule fois
ENTRYPOINT ["/bin/bash", "/usr/src/app/entrypoint.sh"]
