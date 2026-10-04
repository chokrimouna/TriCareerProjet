# =====================================================================
# Frontend TriCareer : application React/Vite servie par Nginx
#   1) build  : compile l'application (npm run build -> dossier dist)
#   2) runtime: Nginx sert les fichiers statiques
# =====================================================================

# --------- ÉTAPE 1 : build de l'application ---------
FROM node:20-alpine AS build
WORKDIR /app

# Installation des dépendances.
# On n'utilise PAS le package-lock.json (généré sous Windows) ni `npm ci` :
# cela évite le bug npm des dépendances natives optionnelles de rollup
# (@rollup/rollup-linux-x64-musl introuvable). `npm install` régénère
# les bonnes dépendances natives pour Linux/Alpine dans le conteneur.
COPY package.json ./
RUN npm install

# URL de l'API injectée au moment du build (Vite remplace import.meta.env)
ARG VITE_API_BASE_URL=http://localhost:5144
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build de production
COPY . ./
RUN npm run build


# --------- ÉTAPE 2 : serveur web Nginx ---------
FROM nginx:alpine AS runtime

# Configuration Nginx pour une Single Page Application (React Router)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques générés
COPY --from=build /app/dist /usr/share/nginx/html


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
