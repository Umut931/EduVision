# Gestionnaire Web

Application web de gestion avec Node.js qui permet d'afficher :
- 🌤️ La météo de Paris
- 📅 L'emploi du temps Pronote (en temps réel)
- 📁 Les fichiers locaux (documents et vidéos)

## Installation

1. Installez les dépendances :
```bash
npm install
```

2. (Optionnel) Configurez votre clé API OpenWeatherMap pour la météo :
   - Créez un fichier `.env` à la racine du projet
   - Ajoutez : `OPENWEATHER_API_KEY=votre_cle_api`
   - Vous pouvez obtenir une clé gratuite sur https://openweathermap.org/api

3. (Optionnel) Configurez le dossier des fichiers locaux :
   - Par défaut, les fichiers sont dans le dossier `fichiers/` à la racine
   - Vous pouvez changer cela avec la variable d'environnement : `DOSSIER_FICHIERS=chemin/vers/vos/fichiers`

## Utilisation

1. Démarrez le serveur :
```bash
npm start
```

Ou en mode développement (avec rechargement automatique) :
```bash
npm run dev
```

2. Ouvrez votre navigateur à l'adresse : http://localhost:3000

3. Cliquez sur les boutons pour :
   - **Météo de Paris** : Affiche les conditions météorologiques actuelles
   - **Emploi du Temps Pronote** : Affiche l'emploi du temps (structure de base - à configurer avec vos identifiants Pronote)
   - **Fichiers Locaux** : Liste et affiche les documents/vidéos stockés localement

## Structure des fichiers

- `server.js` : Serveur Express avec les routes API
- `public/index.html` : Interface utilisateur
- `fichiers/` : Dossier pour stocker vos fichiers locaux (créé automatiquement)

## Notes

- **Météo** : Fonctionne avec une clé API OpenWeatherMap (gratuite)
- **Pronote** : Structure de base fournie - nécessite une intégration avec l'API Pronote (bibliothèque comme `pronote-api`)
- **Fichiers** : Supporte les formats PDF, DOC, DOCX, TXT, ODT, XLS, XLSX, PPT, PPTX pour les documents et MP4, AVI, MOV, MKV, WEBM, FLV, WMV pour les vidéos
