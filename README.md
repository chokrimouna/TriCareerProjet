# TriCareer — Application conteneurisée (Docker)

Application complète de gestion de carrière / recrutement, packagée avec **Docker**.
Aucune installation manuelle de .NET, Node, SQL Server ou Keycloak n'est nécessaire :
tout est fourni sous forme d'images Docker.

## Architecture

| Service     | Technologie                     | Port (hôte) | Rôle                          |
|-------------|----------------------------------|-------------|-------------------------------|
| `frontend`  | React + Vite (servi par Nginx)   | **5174**    | Interface web                 |
| `api`       | ASP.NET Core (.NET 7) + Python   | **5144**    | API REST + analyse de CV (IA) |
| `keycloak`  | Keycloak                         | **8080**    | Authentification              |
| `sqlserver` | SQL Server 2022                  | 15433       | Base de données (pré-remplie) |

Les bases `TriCareerDb` et `keycloak` sont **restaurées automatiquement** au premier
démarrage à partir des sauvegardes incluses dans l'image `tricareer-db`.

---

## 🚀 Démarrage rapide (utilisateur final / encadrante)

### Prérequis — une seule chose à installer
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows / Mac / Linux).
  C'est le seul logiciel requis. Vérifier qu'il tourne : `docker --version`.

### Étapes

1. Récupérer les deux fichiers `docker-compose.yml` et `.env` (voir ci-dessous), dans un dossier vide.

2. Créer le fichier `.env` à partir du modèle et y mettre le nom du compte Docker Hub :
   ```bash
   # copier .env.example en .env, puis ouvrir .env et renseigner DOCKERHUB_USER
   ```
   Contenu minimal de `.env` :
   ```env
   DOCKERHUB_USER=mounachokri          # le compte Docker Hub où les images sont publiées
   SA_PASSWORD=YourStrong!Passw0rd
   KEYCLOAK_ADMIN=admin
   KEYCLOAK_ADMIN_PASSWORD=admin
   ```

3. Télécharger les images puis démarrer :
   ```bash
   docker compose pull
   docker compose up -d
   ```

4. Ouvrir l'application dans le navigateur :
   - **Application web** : http://localhost:5174
   - API (documentation Swagger) : http://localhost:5144/swagger
   - Console Keycloak : http://localhost:8080  (admin / admin)

   > ⏳ Au **tout premier** démarrage, SQL Server restaure les bases : prévoir
   > 1 à 2 minutes avant que l'API réponde. Suivre l'avancement avec
   > `docker compose logs -f sqlserver`.

5. Pour arrêter :
   ```bash
   docker compose down          # arrête (conserve les données)
   docker compose down -v       # arrête ET supprime les données (repart de zéro)
   ```

---

## 🛠️ Construire et publier les images (mainteneur / développeuse)

> Ces étapes sont à faire **une fois** par Mouna pour publier les images sur Docker Hub.
> Elles nécessitent les sources du dépôt.

### 1. Configurer `.env`
```bash
cp .env.example .env
# éditer .env : DOCKERHUB_USER = ton identifiant Docker Hub
```

### 2. Se connecter à Docker Hub
```bash
docker login
# saisir le nom d'utilisateur Docker Hub + un mot de passe ou un Access Token
```

### 3. Construire les images
```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml build
```

### 4. Tester en local
```bash
docker compose up -d
# vérifier http://localhost:5174 puis arrêter avec : docker compose down
```

### 5. Publier sur Docker Hub
```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml push
```

Trois images sont publiées :
- `DOCKERHUB_USER/tricareer-db`
- `DOCKERHUB_USER/tricareer-api`
- `DOCKERHUB_USER/tricareer-frontend`

(Keycloak utilise l'image officielle `quay.io/keycloak/keycloak`, rien à publier.)

---

## ⚠️ Sécurité

- Le fichier `.env` (mots de passe) **n'est jamais** poussé sur Git (voir `.gitignore`).
- Le fichier `backend/tri360-career-api/tri360-career-api/appsettings.json` contient
  des clés/API (Gmail, Google, Whereby...). Le dépôt étant **privé**, elles ne sont pas
  exposées publiquement, mais il est **fortement recommandé de les régénérer** car elles
  ont déjà circulé.

---

## 🧩 Dépannage

| Problème | Solution |
|----------|----------|
| L'API renvoie une erreur de connexion DB au démarrage | Attendre la fin de la restauration (`docker compose logs -f sqlserver`). |
| `docker compose up` essaie de *builder* au lieu de *pull* | Lancer d'abord `docker compose pull`. |
| Le port 5174/5144/8080 est déjà utilisé | Modifier le mapping `ports:` dans `docker-compose.yml`. |
| Repartir totalement à zéro | `docker compose down -v` puis `docker compose up -d`. |

---

## 📁 Fichiers Docker du projet

```
tricareer/
├── docker-compose.yml              # orchestration (livrable)
├── docker-compose.build.yml        # surcouche de build (développeur)
├── .env.example                    # modèle de configuration
├── backend/
│   ├── db/
│   │   ├── Dockerfile              # image SQL Server + restauration
│   │   ├── entrypoint.sh
│   │   ├── init.sql
│   │   ├── TriCareer.bak
│   │   └── keycloak.bak
│   └── tri360-career-api/tri360-career-api/
│       ├── Dockerfile              # image API (.NET 7 + Python)
│       ├── .dockerignore
│       └── requirements.txt
└── frontend/
    ├── Dockerfile                  # image frontend (Vite + Nginx)
    ├── .dockerignore
    └── nginx.conf
```
