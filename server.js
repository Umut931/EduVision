const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const ical = require('ical');
const https = require('https');

const app = express();
const PORT = 3000;

// ===================== SYSTÈME DE LOGS =====================
const logsDir = path.join(__dirname, 'logs');

// Créer le dossier logs s'il n'existe pas
fs.ensureDirSync(logsDir);

// Fonction pour logger les événements
function logEvent(level, message, details = '') {
    const timestamp = new Date().toLocaleString('fr-FR');
    const logMessage = `[${timestamp}] [${level}] ${message}${details ? ' - ' + JSON.stringify(details) : ''}\n`;
    
    // Log dans la console
    const colors = {
        'INFO': '\x1b[36m',    // Cyan
        'ERROR': '\x1b[31m',   // Rouge
        'WARNING': '\x1b[33m', // Jaune
        'SUCCESS': '\x1b[32m'  // Vert
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}${logMessage}${reset}`);
    
    // Log dans le fichier
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage);
}

// Middleware pour logger les requêtes
app.use((req, res, next) => {
    logEvent('INFO', `Requête ${req.method}`, { url: req.path, ip: req.ip });
    next();
});

// ===================== FIN SYSTÈME DE LOGS =====================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route principale - sert index.html
app.get('/', (req, res) => {
    logEvent('INFO', 'Accès à la page principale');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour la météo de Paris
app.get('/api/meteo', async (req, res) => {
    try {
        logEvent('INFO', 'Appel API météo');
        // Utilisation de l'API OpenWeatherMap (gratuite)
        // Remplacez 'VOTRE_CLE_API' par votre clé API OpenWeatherMap
        // Vous pouvez obtenir une clé gratuite sur https://openweathermap.org/api
        const API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
        const url = `https://api.openweathermap.org/data/2.5/weather?q=Paris,fr&appid=${API_KEY}&units=metric&lang=fr`;
        
        const response = await axios.get(url);
        logEvent('SUCCESS', 'Données météo récupérées avec succès', { ville: response.data.name });
        res.json({
            success: true,
            data: {
                ville: response.data.name,
                temperature: response.data.main.temp,
                description: response.data.weather[0].description,
                humidite: response.data.main.humidity,
                vent: response.data.wind?.speed || 0,
                icone: response.data.weather[0].icon
            }
        });
    } catch (error) {
        logEvent('ERROR', 'Erreur météo', { message: error.message, code: error.code });
        // Données de démonstration si l'API n'est pas disponible
        res.json({
            success: false,
            data: {
                ville: 'Paris',
                temperature: 'N/A',
                description: 'Données non disponibles. Configurez votre clé API OpenWeatherMap.',
                humidite: 'N/A',
                vent: 'N/A',
                icone: '01d'
            },
            message: 'Utilisez une clé API OpenWeatherMap pour les vraies données'
        });
    }
});

// Route pour l'emploi du temps Pronote
app.get('/api/pronote', async (req, res) => {
    try {
        logEvent('INFO', 'Appel API Pronote');
        
        // Charger depuis le fichier local mesinformations.ics
        const icalPath = path.join(__dirname, 'mesinformations.ics');
        let icalContent;
        
        if (await fs.pathExists(icalPath)) {
            icalContent = await fs.readFile(icalPath, 'utf-8');
            logEvent('SUCCESS', 'Flux iCal Pronote chargé depuis le fichier local');
        } else {
            // Fallback sur l'URL distant si le fichier n'existe pas
            const icalUrl = process.env.PRONOTE_ICAL_URL || 'https://0750711r.index-education.net/pronote/ical/mesinformations.ics?icalsecurise=2B3753E050B35B169E18C7624BB7DA25F623F2DFE26654D9AC4F54FE775E35858B3C20E8ABB0FFD0D9AB7F9C6FF1CC70&version=2025.2.8&param=900A75DF9ED8C62E212781A9E4DCC937';

            // Récupération du fichier iCal distant
            // Attention : on désactive ici la vérification du certificat TLS car
            // le certificat du serveur Pronote est expiré.
            // C'est pratique pour un projet perso, mais à NE PAS faire en prod.
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

            const icalResponse = await axios.get(icalUrl, {
                responseType: 'text',
                httpsAgent
            });

            icalContent = icalResponse.data;
            logEvent('SUCCESS', 'Flux iCal Pronote récupéré depuis l\'URL distant');
        }

        // Parsing du contenu iCal
        const events = ical.parseICS(icalContent);

        // Fonction utilitaire : comparer deux dates au jour près
        const estMemeJour = (d1, d2) => (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );

        const formatterHeure = (date) =>
            date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const maintenant = new Date();
        let dateSelectionnee = maintenant;
        let cours = [];
        let decalageJour = 0;

        // On cherche d'abord les cours d'aujourd'hui.
        // Si on ne trouve rien, on regarde les jours suivants (jusqu'à 7 jours).
        for (let offset = 0; offset < 7 && cours.length === 0; offset++) {
            const jourCible = new Date(maintenant);
            jourCible.setDate(jourCible.getDate() + offset);

            const coursPourJour = [];

            for (const key in events) {
                const ev = events[key];
                if (!ev || ev.type !== 'VEVENT' || !ev.start || !ev.end) continue;

                if (!estMemeJour(ev.start, jourCible)) continue;

                // Convertir les champs en chaînes de caractères
                const getSummary = () => {
                    if (typeof ev.summary === 'string') return ev.summary;
                    if (ev.summary && ev.summary.value) return ev.summary.value;
                    if (ev.summary && typeof ev.summary === 'object') {
                        return JSON.stringify(ev.summary);
                    }
                    if (ev.summary) return String(ev.summary);
                    return 'Cours';
                };
                const getLocation = () => {
                    if (typeof ev.location === 'string') return ev.location;
                    if (ev.location && ev.location.value) return ev.location.value;
                    if (ev.location && typeof ev.location === 'object') {
                        return JSON.stringify(ev.location);
                    }
                    if (ev.location) return String(ev.location);
                    return 'Non précisée';
                };
                const getDescription = () => {
                    if (typeof ev.description === 'string') return ev.description;
                    if (ev.description && ev.description.value) return ev.description.value;
                    if (ev.description && typeof ev.description === 'object') {
                        return JSON.stringify(ev.description);
                    }
                    if (ev.description) return String(ev.description);
                    return '';
                };

                const summary = getSummary();
                const location = getLocation();
                const description = getDescription();

                // Parser le format Pronote: "Matière - Professeur(s) - [Salle complexe] - Salle"
                let matiere = summary;
                let salle = location;
                let professeur = 'Non précisé';
                
                // Essayer d'extraire depuis le summary au format Pronote
                const parts = summary.split(' - ');
                
                if (parts.length >= 2) {
                    matiere = parts[0].trim();
                    professeur = parts[1].trim();
                    
                    // Chercher la salle entre crochets (format avec salle complexe)
                    const salleMatch = summary.match(/\[([^\]]+)\]/);
                    if (salleMatch) {
                        salle = salleMatch[1].trim();
                    } else if (parts.length >= 3) {
                        // Sinon prendre le dernier élément (salle simple)
                        // Éliminer les éléments qui sont des cours (contiennent "cours" ou "TP")
                        for (let i = parts.length - 1; i >= 2; i--) {
                            const part = parts[i].trim();
                            if (!part.toLowerCase().includes('cours') && !part.toLowerCase().includes('tp')) {
                                salle = part;
                                break;
                            }
                        }
                    } else {
                        salle = location || 'Non précisée';
                    }
                } else {
                    salle = location || 'Non précisée';
                }
                
                // Fallback: chercher le professeur dans la description si pas trouvé
                if (professeur === 'Non précisé' || professeur === '') {
                    const profMatch = description.match(/Professeur[s]?\s*:\s*([^\n]+)/i);
                    if (profMatch) {
                        professeur = profMatch[1].trim();
                    }
                }

                coursPourJour.push({
                    matiere: matiere,
                    heure: `${formatterHeure(ev.start)} - ${formatterHeure(ev.end)}`,
                    salle: salle,
                    professeur: professeur
                });
            }

            if (coursPourJour.length > 0) {
                cours = coursPourJour;
                dateSelectionnee = jourCible;
                decalageJour = offset;
                break;
            }
        }

        const jour = dateSelectionnee.toLocaleDateString('fr-FR', { weekday: 'long' });
        const date = dateSelectionnee.toLocaleDateString('fr-FR');

        let message = null;
        if (cours.length === 0) {
            message = 'Aucun cours trouvé dans Pronote pour les 7 prochains jours.';
        } else if (decalageJour > 0) {
            message = 'Aucun cours aujourd’hui. Affichage du prochain jour où des cours sont prévus.';
        }
        logEvent('SUCCESS', 'Emploi du temps récupéré', { jour, nbCours: cours.length });
        const edt = {
            jour,
            date,
            cours,
            message
        };

        res.json({
            success: true,
            data: edt
        });

    } catch (error) {
        logEvent('ERROR', 'Erreur Pronote', { message: error.message, code: error.code });
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'emploi du temps'
        });
    }
});

// Route pour lister les fichiers locaux (documents et vidéos)
app.get('/api/fichiers', async (req, res) => {
    try {
        logEvent('INFO', 'Listing des fichiers');
        // Chemin par défaut - vous pouvez le modifier selon vos besoins
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        
        // Créer le dossier s'il n'existe pas
        await fs.ensureDir(dossierFichiers);
        
        // Extensions supportées
        const extensionsDocuments = ['.pdf', '.doc', '.docx', '.txt', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'];
        const extensionsVideos = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];
        
        const fichiers = await fs.readdir(dossierFichiers);
        const fichiersAvecInfos = [];
        
        for (const fichier of fichiers) {
            const cheminComplet = path.join(dossierFichiers, fichier);
            const stats = await fs.stat(cheminComplet);
            
            if (stats.isFile()) {
                const ext = path.extname(fichier).toLowerCase();
                const type = extensionsVideos.includes(ext) ? 'video' : 
                            extensionsDocuments.includes(ext) ? 'document' : 'autre';
                
                fichiersAvecInfos.push({
                    nom: fichier,
                    type: type,
                    taille: stats.size,
                    dateModification: stats.mtime,
                    chemin: `/api/fichiers/lecture/${encodeURIComponent(fichier)}`
                });
            }
        }
        
        logEvent('SUCCESS', 'Fichiers listés', { nombre: fichiersAvecInfos.length });

        res.json({
            success: true,
            dossier: dossierFichiers,
            fichiers: fichiersAvecInfos
        });
    } catch (error) {
        logEvent('ERROR', 'Erreur listing fichiers', { message: error.message, code: error.code });
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la lecture des fichiers'
        });
    }
});

// Route pour servir les fichiers (lecture)
app.get('/api/fichiers/lecture/:nomFichier', async (req, res) => {
    try {
        const nomFichier = decodeURIComponent(req.params.nomFichier);
        logEvent('INFO', 'Lecture fichier', { fichier: nomFichier });
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const cheminFichier = path.join(dossierFichiers, nomFichier);
        
        // Vérifier que le fichier existe
        if (!await fs.pathExists(cheminFichier)) {
            logEvent('WARNING', 'Fichier non trouvé', { fichier: nomFichier });
            return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
        }
        
        logEvent('SUCCESS', 'Fichier servi', { fichier: nomFichier });
        // Servir le fichier
        res.sendFile(cheminFichier);
    } catch (error) {
        logEvent('ERROR', 'Erreur lecture fichier', { message: error.message, code: error.code });
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la lecture du fichier'
        });
    }
});

// Stockage temporaire de la sélection (en mémoire)
let selectionMedias = [];

// Endpoint pour mettre à jour la sélection de médias
app.post('/api/selection', (req, res) => {
    const { fichiers } = req.body;
    if (!Array.isArray(fichiers)) {
        return res.status(400).json({ success: false, message: 'Format attendu: { fichiers: [ ... ] }' });
    }
    selectionMedias = fichiers;
    logEvent('INFO', 'Sélection de médias mise à jour', { selection: selectionMedias });
    res.json({ success: true, selection: selectionMedias });
});

// Endpoint pour obtenir la sélection courante (pour EduVision-Beta)
app.get('/api/medias', async (req, res) => {
    try {
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const fichiersInfos = [];
        for (const nom of selectionMedias) {
            const cheminComplet = path.join(dossierFichiers, nom);
            if (await fs.pathExists(cheminComplet)) {
                const stats = await fs.stat(cheminComplet);
                fichiersInfos.push({
                    nom,
                    taille: stats.size,
                    dateModification: stats.mtime,
                    url: `/api/fichiers/lecture/${encodeURIComponent(nom)}`
                });
            }
        }
        res.json({ success: true, medias: fichiersInfos });
    } catch (error) {
        logEvent('ERROR', 'Erreur récupération sélection', { message: error.message });
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la sélection' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    logEvent('SUCCESS', `Serveur démarré sur http://localhost:${PORT}`);
    logEvent('INFO', `Dossier fichiers: ${process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers')}`);
    logEvent('INFO', `Logs sauvegardés dans: ${logsDir}`);
});

