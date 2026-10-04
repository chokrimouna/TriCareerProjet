#!/bin/bash
# =====================================================================
# Démarre SQL Server, attend qu'il soit prêt, puis restaure les bases
# une seule fois (au tout premier démarrage du volume).
# =====================================================================
set -e

SA_PASSWORD="${MSSQL_SA_PASSWORD:-${SA_PASSWORD}}"
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
INIT_MARKER="/var/opt/mssql/data/.tricareer_initialized"

# 1) Démarre le moteur SQL Server en tâche de fond
/opt/mssql/bin/sqlservr &
SQL_PID=$!

# 2) Attend que SQL Server réponde (max ~120s)
echo "[init] Attente du démarrage de SQL Server..."
for i in $(seq 1 60); do
  if "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1; then
    echo "[init] SQL Server est prêt."
    break
  fi
  sleep 2
done

# 3) Restaure les bases une seule fois
#    -b : sqlcmd renvoie une erreur si une commande SQL échoue
#    => le marqueur n'est créé QUE si la restauration a réussi
if [ ! -f "$INIT_MARKER" ]; then
  echo "[init] Première initialisation : restauration des bases..."
  if "$SQLCMD" -S localhost -U sa -P "$SA_PASSWORD" -C -b -i /usr/src/app/init.sql; then
    touch "$INIT_MARKER"
    echo "[init] Restauration terminée avec succès."
  else
    echo "[init] ERREUR pendant la restauration. Voir les logs ci-dessus." >&2
  fi
else
  echo "[init] Bases déjà initialisées, on saute la restauration."
fi

# 4) Garde le conteneur vivant tant que SQL Server tourne
wait "$SQL_PID"
