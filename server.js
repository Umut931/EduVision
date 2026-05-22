const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const ical = require('ical');
const https = require('https');
const { spawn } = require('child_process');
const multer = require('multer');
const http = require('http');
const socketIo = require('socket.io');
const sensorsModule = require('./services/sensors');

// PDF parsing
let pdfParse = null;
try {
    pdfParse = require('pdf-parse');
} catch (err) {
    console.log('[PDF-PARSE] ⚠️ pdf-parse non disponible, utilisation heuristique');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});
const PORT = 3000;
const SERVER_START_TIME = Date.now(); // change à chaque redémarrage

const publicDir = path.join(__dirname, 'public');
const hlsDir = path.join(publicDir, 'hls');

fs.ensureDirSync(hlsDir);

// Mode d'affichage pour les clients : 'documents' ou 'camera'
let currentDisplayMode = 'documents';
// Page à afficher sur les clients Raspberry : 'documents', 'camera', 'meteo', 'pronote', 'horloge'
let currentDisplayPage = 'documents';

// Synchronisation PDF
let currentPdfFile = null; // Nom du fichier PDF actuel
let currentPdfPage = 1; // Page actuelle du PDF
let totalPdfPages = 0; // Nombre total de pages du PDF
let pdfZoomLevel = 100; // Niveau de zoom du PDF (en %)

let ffmpegProcess = null;

function nettoyerHls() {
    try {
        const fichiers = fs.readdirSync(hlsDir);
        fichiers.forEach((fichier) => {
            const chemin = path.join(hlsDir, fichier);
            try {
                fs.unlinkSync(chemin);
            } catch (err) {
                logEvent('WARNING', 'Impossible de supprimer un fichier HLS', { fichier, erreur: err.message });
            }
        });
    } catch (err) {
        logEvent('WARNING', 'Impossible de lire le dossier HLS', { erreur: err.message });
    }
}

function demarrerFluxCamera() {
    if (ffmpegProcess) {
        logEvent('INFO', 'Flux caméra déjà actif');
        return;
    }

    const rtspUrl = 'rtsp://EduVision:Bergson75019@192.168.0.103:554/stream1';

    logEvent('INFO', 'Démarrage du flux caméra', { rtspUrlMasque: 'rtsp://***:***@192.168.0.103:554/stream1' });

    ffmpegProcess = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-f', 'mjpeg',
        '-q:v', '2',
        '-r', '15',
        'pipe:1'
    ]);

    let mjpegBuffer = Buffer.alloc(0);

    ffmpegProcess.stdout.on('data', (data) => {
        mjpegBuffer = Buffer.concat([mjpegBuffer, data]);
        let start = 0;
        while (true) {
            const soiIndex = mjpegBuffer.indexOf(Buffer.from([0xFF, 0xD8]), start);
            if (soiIndex === -1) break;
            const eoiIndex = mjpegBuffer.indexOf(Buffer.from([0xFF, 0xD9]), soiIndex + 2);
            if (eoiIndex === -1) break;
            const jpegFrame = mjpegBuffer.slice(soiIndex, eoiIndex + 2);
            io.emit('camera-frame', jpegFrame.toString('base64'));
            start = eoiIndex + 2;
        }
        mjpegBuffer = mjpegBuffer.slice(start);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        logEvent('INFO', 'FFmpeg', data.toString());
    });

    ffmpegProcess.on('error', (err) => {
        logEvent('ERROR', 'Erreur lancement FFmpeg', { message: err.message });
        ffmpegProcess = null;
    });

    ffmpegProcess.on('close', (code) => {
        logEvent('WARNING', 'FFmpeg arrêté', { code });
        ffmpegProcess = null;
    });
}

function attendreFichierHls(timeoutMs = 5000) {
    const fichier = path.join(hlsDir, 'stream.m3u8');
    const intervalMs = 200;
    let elapsed = 0;

    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            if (fs.existsSync(fichier)) {
                clearInterval(interval);
                resolve(true);
                return;
            }

            elapsed += intervalMs;
            if (elapsed >= timeoutMs) {
                clearInterval(interval);
                reject(new Error('Fichier HLS non créé dans le délai imparti'));
            }
        }, intervalMs);
    });
}

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

// ===================== FONCTIONS PDF SYNCHRONISÉ =====================

// Fonction pour estimer le nombre de pages d'un PDF
async function estimatePdfPages(fileName) {
    try {
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const cheminPdf = path.join(dossierFichiers, fileName);
        
        if (!await fs.pathExists(cheminPdf)) {
            logEvent('WARNING', 'Fichier PDF non trouvé pour estimation', { fichier: fileName });
            return 50; // Défaut plus haut
        }
        
        // Essayer d'utiliser pdf-parse pour la détection précise
        if (pdfParse) {
            try {
                const fileBuffer = await fs.readFile(cheminPdf);
                const pdfData = await pdfParse(fileBuffer);
                const pages = pdfData.numpages || pdfData.info?.Pages || pdfData.numpages;
                
                if (pages && pages > 0) {
                    logEvent('SUCCESS', '✅ Pages PDF détectées avec pdf-parse', { 
                        fichier: fileName, 
                        pages: pages 
                    });
                    return pages;
                }
            } catch (err) {
                logEvent('DEBUG', '⚠️ pdf-parse échoué, utilisation heuristique', { 
                    fichier: fileName, 
                    erreur: err.message 
                });
            }
        }
        
        // Fallback: Heuristique améliorée (beaucoup plus conservative)
        // Avant: 1 page par 10KB (trop bas)
        // Maintenant: 1 page par 5KB + minimum de 50 pages
        const stats = await fs.stat(cheminPdf);
        let estimatedPages = Math.max(50, Math.ceil(stats.size / 5120));
        estimatedPages = Math.min(estimatedPages, 500); // Limiter à 500 pages max
        
        logEvent('DEBUG', 'Pages PDF estimées (heuristique)', { 
            fichier: fileName, 
            tailleBytes: stats.size, 
            pagesEstimées: estimatedPages 
        });
        return estimatedPages;
    } catch (err) {
        logEvent('WARNING', 'Erreur estimation pages PDF', { fichier: fileName, erreur: err.message });
        return 50; // Défaut plus haut en cas d'erreur
    }
}

// Fonction pour définir la page PDF actuelle
function setPdfPage(file, page) {
    console.log('🔧 setPdfPage appelée avec:', { file, page, type_file: typeof file });
    
    if (!file || file === '' || file === 'null') {
        console.log('❌ Fichier invalide ou vide');
        return false;
    }
    
    if (page < 1) {
        console.log('❌ Page invalide:', page);
        return false;
    }
    
    // Si totalPdfPages est 0 ou n'est pas défini, on utilise une valeur par défaut
    if (!totalPdfPages || totalPdfPages === 0) {
        totalPdfPages = 10; // Valeur par défaut
    }
    
    if (page > totalPdfPages) {
        console.log('❌ Page dépassant le total:', page, '>', totalPdfPages);
        return false;
    }
    
    console.log('✅ Définition du PDF:', { file, page, totalPages: totalPdfPages });
    currentPdfFile = file;
    currentPdfPage = page;
    
    broadcastPdfSync();
    logEvent('INFO', 'Page PDF changée', { file, page, totalPages: totalPdfPages });
    return true;
}

// ===================== FIN SYSTÈME DE LOGS =====================
app.use((req, res, next) => {
    logEvent('INFO', `Requête ${req.method}`, { url: req.path, ip: req.ip });
    next();
});

// ===================== FIN SYSTÈME DE LOGS =====================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));
app.use('/hls', express.static(hlsDir));

// Route pour servir les fichiers PDF et autres documents
const dossierFichiersDefault = path.join(__dirname, 'fichiers');
app.use('/fichiers', express.static(process.env.DOSSIER_FICHIERS || dossierFichiersDefault));

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        fs.ensureDirSync(dossierFichiers);
        cb(null, dossierFichiers);
    },
    filename: function (req, file, cb) {
        // Garder le nom original du fichier
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// ===================== INITIALISATION DES CAPTEURS =====================
let sensorInterval = null;
let sensorClients = new Set();

// Initialiser les capteurs au démarrage
sensorsModule.initializeSensors().catch(err => {
    logEvent('WARNING', 'Initialisation des capteurs échouée', { message: err.message });
});

// Ensemble pour tracker les clients Raspberry (display clients)
let displayClients = new Set();

// ===================== CONTRÔLE SYSTÈME RASPBERRY PI =====================
// Agents système (Node.js companion tournant sur chaque Pi client)
// Clé: screenId, valeur: { screenId, ip, hostname, status, socketId|null, connectedAt, lastSeen }
const knownAgents = new Map();
const agentSocketIds = new Set(); // socketIds des agents (pas des browsers)

const ALLOWED_SYSTEM_COMMANDS = ['shutdown', 'reboot', 'screen-off', 'screen-on'];

function broadcastAgentUpdate() {
    const agents = [...knownAgents.values()];
    io.sockets.sockets.forEach((s) => {
        if (!agentSocketIds.has(s.id)) {
            s.emit('system-agents-update', agents);
        }
    });
}

function executeLocalCommand(command) {
    return new Promise((resolve, reject) => {
        const CENTRAL_COMMANDS = {
            'shutdown': { file: 'sudo', args: ['/sbin/shutdown', '-h', 'now'] },
            'reboot':   { file: 'sudo', args: ['/sbin/reboot'] },
            'screen-off': { file: '/usr/bin/vcgencmd', args: ['display_power', '0'] },
            'screen-on':  { file: '/usr/bin/vcgencmd', args: ['display_power', '1'] },
        };
        const cmd = CENTRAL_COMMANDS[command];
        if (!cmd) return reject(new Error('Commande inconnue'));
        const env = { ...process.env, DISPLAY: ':0' };
        const proc = spawn(cmd.file, cmd.args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Code ${code}`)));
        proc.on('error', reject);
    });
}

// Fonction pour construire et envoyer la liste des médias
async function broadcastMediasList() {
    try {
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const fichiersInfos = [];
        
        for (const nom of selectionMedias) {
            if (nom === 'camera') {
                if (currentDisplayMode === 'camera') {
                    fichiersInfos.push({
                        nom: 'camera',
                        type: 'camera',
                        duration: selectionMediasDuration[nom] || 30,
                        url: '/camera-page.html'
                    });
                }
            } else {
                if (currentDisplayMode === 'documents') {
                    const cheminComplet = path.join(dossierFichiers, nom);
                    if (await fs.pathExists(cheminComplet)) {
                        const stats = await fs.stat(cheminComplet);
                        fichiersInfos.push({
                            nom,
                            taille: stats.size,
                            dateModification: stats.mtime,
                            duration: selectionMediasDuration[nom] || 10,
                            url: `/api/fichiers/lecture/${encodeURIComponent(nom)}`
                        });
                    }
                }
            }
        }
        
        // Émettre aux clients Raspberry uniquement
        displayClients.forEach(clientId => {
            io.to(clientId).emit('medias-list', {
                success: true,
                medias: fichiersInfos,
                timestamp: new Date().toISOString()
            });
        });
    } catch (error) {
        logEvent('ERROR', 'Erreur broadcast médias', { message: error.message });
    }
}

function broadcastDisplayPage() {
    displayClients.forEach(clientId => {
        io.to(clientId).emit('display-page-changed', {
            page: currentDisplayPage,
            timestamp: new Date().toISOString()
        });
    });
}

// Synchronisation PDF
function broadcastPdfSync() {
    displayClients.forEach(clientId => {
        io.to(clientId).emit('pdf-sync', {
            file: currentPdfFile,
            page: currentPdfPage,
            totalPages: totalPdfPages,
            zoom: pdfZoomLevel,
            timestamp: new Date().toISOString()
        });
    });
}

function setDisplayPage(page) {
    const pagesValides = ['documents', 'camera', 'meteo', 'pronote', 'horloge'];
    if (!pagesValides.includes(page)) return false;

    currentDisplayPage = page;
    if (page === 'documents' || page === 'camera') {
        currentDisplayMode = page;
    }

    logEvent('INFO', 'Page d\'affichage changée', { page: currentDisplayPage, mode: currentDisplayMode });
    broadcastDisplayPage();

    if (currentDisplayPage === 'documents' || currentDisplayPage === 'camera') {
        broadcastMediasList();
    }

    // Démarrer automatiquement le flux caméra si la page est "camera"
    if (currentDisplayPage === 'camera') {
        demarrerFluxCamera();
    }

    return true;
}

// Configuration des événements Socket.IO
io.on('connection', (socket) => {
    logEvent('INFO', 'Client Socket.IO connecté', { id: socket.id });
    sensorClients.add(socket.id);

    // ── Enregistrement agent système (companion Node.js sur Pi client) ──
    socket.on('register-system-agent', (data) => {
        if (!data || !data.screenId) return;
        const screenId = String(data.screenId).substring(0, 32).replace(/[^a-zA-Z0-9_-]/g, '');
        if (!screenId) return;

        agentSocketIds.add(socket.id);

        const agentInfo = {
            screenId,
            ip: data.ip || socket.handshake.address || 'unknown',
            hostname: data.hostname || screenId,
            status: 'online',
            socketId: socket.id,
            connectedAt: new Date().toISOString(),
            lastSeen: Date.now(),
        };
        knownAgents.set(screenId, agentInfo);

        logEvent('SUCCESS', '🤖 Agent système enregistré', { screenId, ip: agentInfo.ip, socketId: socket.id });
        socket.emit('agent-registered', { screenId });
        broadcastAgentUpdate();
    });

    // ── Heartbeat de l'agent ──
    socket.on('agent-heartbeat', (data) => {
        const agent = data?.screenId ? knownAgents.get(data.screenId) : null;
        if (agent && agent.socketId === socket.id) {
            agent.lastSeen = Date.now();
            if (data.status) agent.status = data.status;
        }
    });

    // ── Mise à jour de statut émise par l'agent ──
    socket.on('agent-status-update', (data) => {
        const agent = data?.screenId ? knownAgents.get(data.screenId) : null;
        if (agent && agent.socketId === socket.id && data.status) {
            agent.status = data.status;
            broadcastAgentUpdate();
        }
    });

    // ── Résultat d'une commande système renvoyé par l'agent ──
    socket.on('system-command-result', (data) => {
        if (!data) return;
        logEvent(data.success ? 'SUCCESS' : 'ERROR', '⚙️ Résultat commande système', {
            screenId: data.screenId, command: data.command,
            success: data.success, message: data.message
        });

        const agent = data.screenId ? knownAgents.get(data.screenId) : null;
        if (agent && agent.socketId === socket.id) {
            if (data.success) {
                if (data.command === 'screen-off') agent.status = 'sleeping';
                else if (data.command === 'screen-on') agent.status = 'online';
                else if (data.command === 'shutdown') agent.status = 'shutting-down';
                else if (data.command === 'reboot') agent.status = 'rebooting';
            } else {
                agent.status = 'error';
            }
            agent.lastSeen = Date.now();
        }
        // Retransmettre le résultat à tous les sockets admin (non-agents)
        io.sockets.sockets.forEach((s) => {
            if (!agentSocketIds.has(s.id)) s.emit('system-command-result', data);
        });
        broadcastAgentUpdate();
    });

    // ── Commande admin vers les agents clients ──
    socket.on('admin-system-command', (data) => {
        if (agentSocketIds.has(socket.id)) return; // les agents ne peuvent pas envoyer des commandes
        if (!data) return;

        const command = data.command;
        if (!ALLOWED_SYSTEM_COMMANDS.includes(command)) {
            socket.emit('system-command-error', { message: `Commande non autorisée: ${command}` });
            return;
        }

        const target = data.target || 'all';
        const commandId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        let targetAgents = [];
        if (target === 'all') {
            targetAgents = [...knownAgents.values()].filter(a => a.socketId);
        } else if (typeof target === 'string') {
            const a = knownAgents.get(target);
            if (a && a.socketId) targetAgents = [a];
        } else if (Array.isArray(target)) {
            targetAgents = target.map(t => knownAgents.get(t)).filter(a => a && a.socketId);
        }

        if (targetAgents.length === 0) {
            socket.emit('system-command-error', { message: 'Aucun agent disponible pour cette cible' });
            return;
        }

        // Mise à jour statut préemptive
        targetAgents.forEach(agent => {
            if (command === 'shutdown') agent.status = 'shutting-down';
            else if (command === 'reboot') agent.status = 'rebooting';
            else if (command === 'screen-off') agent.status = 'sleeping';
            else if (command === 'screen-on') agent.status = 'waking';
        });

        targetAgents.forEach(agent => {
            io.to(agent.socketId).emit('system-command', { commandId, command });
            logEvent('INFO', `⚙️ Commande système envoyée`, { command, screenId: agent.screenId });
        });

        broadcastAgentUpdate();
        socket.emit('system-command-sent', { commandId, count: targetAgents.length });
    });

    // ── Commande admin vers le Pi central (serveur lui-même) ──
    socket.on('admin-central-command', (data) => {
        if (agentSocketIds.has(socket.id)) return;
        const command = data?.command;
        if (!ALLOWED_SYSTEM_COMMANDS.includes(command)) {
            socket.emit('system-command-error', { message: `Commande non autorisée: ${command}` });
            return;
        }
        logEvent('WARNING', `⚙️ Commande centrale reçue: ${command}`);

        if (command === 'shutdown' || command === 'reboot') {
            // Informer tous les clients avant de s'éteindre
            io.emit('server-shutdown-notice', { command, message: 'Serveur arrêté par l\'administrateur' });
            socket.emit('system-command-result', {
                commandId: 'central', command, screenId: 'central',
                success: true, message: `Commande ${command} initiée sur le serveur`
            });
            setTimeout(() => {
                executeLocalCommand(command).catch(err =>
                    logEvent('ERROR', 'Erreur commande centrale', { message: err.message })
                );
            }, 1500);
        } else {
            executeLocalCommand(command)
                .then(() => {
                    socket.emit('system-command-result', {
                        commandId: 'central', command, screenId: 'central',
                        success: true, message: 'OK'
                    });
                })
                .catch(err => {
                    socket.emit('system-command-result', {
                        commandId: 'central', command, screenId: 'central',
                        success: false, message: err.message
                    });
                });
        }
    });

    // Envoyer les données actuelles au nouveau client
    const currentState = sensorsModule.getCurrentState();
    socket.emit('sensor_data', currentState);
    
    // Listener pour les clients Raspberry (display clients)
    socket.on('register-display-client', (data) => {
        displayClients.add(socket.id);
        logEvent('INFO', 'Client Raspberry enregistré', { id: socket.id, screenId: data?.screenId });
        // Envoyer immédiatement le mode courant et la page actuelle
        socket.emit('display-page-changed', { page: currentDisplayPage, timestamp: new Date().toISOString() });
        if (currentDisplayPage === 'documents' || currentDisplayPage === 'camera') {
            broadcastMediasList();
        }
        // Envoyer aussi l'état PDF actuel
        if (currentPdfFile) {
            socket.emit('pdf-sync', {
                file: currentPdfFile,
                page: currentPdfPage,
                totalPages: totalPdfPages,
                zoom: pdfZoomLevel,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('change-display-page', (data) => {
        const page = data && data.page ? String(data.page) : null;
        if (page && setDisplayPage(page)) {
            socket.emit('display-page-changed', { page: currentDisplayPage, timestamp: new Date().toISOString() });
        } else {
            socket.emit('error', { message: 'Page d\'affichage invalide' });
        }
    });

    socket.on('pdf-zoom-change', (data) => {
        if (data && typeof data.zoom === 'number') {
            pdfZoomLevel = Math.max(50, Math.min(200, data.zoom)); // Limiter entre 50 et 200%
            console.log('🔍 Zoom PDF changé à:', pdfZoomLevel + '%');
            broadcastPdfSync(); // Diffuser le nouveau zoom à tous les clients
        }
    });

    socket.on('pdf-next-page', (data) => {
        if (currentPdfFile && currentPdfPage < totalPdfPages) {
            currentPdfPage++;
            console.log('📄 Page PDF avancée à:', currentPdfPage);
            broadcastPdfSync();
        }
    });

    socket.on('pdf-prev-page', (data) => {
        if (currentPdfFile && currentPdfPage > 1) {
            currentPdfPage--;
            console.log('📄 Page PDF reculée à:', currentPdfPage);
            broadcastPdfSync();
        }
    });

    // Listeners pour les annotations PDF
    socket.on('pdf-annotation', (data, ackCallback) => {
        if (data && (data.dataUrl || data.annotation)) {
            console.log('📝 Annotation PDF reçue, diffusion à', displayClients.size, 'client(s) — page:', data.page, 'fichier:', data.file);
            displayClients.forEach(clientId => {
                io.to(clientId).emit('pdf-annotation', data);
            });
            if (typeof ackCallback === 'function') {
                ackCallback({ received: true, displayClients: displayClients.size });
            }
        }
    });

    // Streaming temps réel des traits de dessin (coordonnées normalisées)
    socket.on('pdf-draw-start', (data) => {
        if (displayClients.size === 0) {
            console.warn('⚠️ [SERVER] pdf-draw-start reçu mais AUCUN client d\'affichage connecté — trait perdu !');
        } else {
            console.log('🖊️ [SERVER] pdf-draw-start reçu → diffusion à', displayClients.size, 'client(s) — file:', data && data.file, 'page:', data && data.page);
        }
        displayClients.forEach(clientId => io.to(clientId).emit('pdf-draw-start', data));
    });
    socket.on('pdf-draw-point', (data) => {
        displayClients.forEach(clientId => io.to(clientId).emit('pdf-draw-point', data));
    });
    socket.on('pdf-draw-end', (data) => {
        console.log('✅ [SERVER] pdf-draw-end → diffusion à', displayClients.size, 'client(s)');
        displayClients.forEach(clientId => io.to(clientId).emit('pdf-draw-end', data));
    });

    socket.on('pdf-clear-annotations', (data) => {
        console.log('🗑️ Effacement annotations PDF:', { page: data.page, file: data.file });
        displayClients.forEach(clientId => {
            io.to(clientId).emit('pdf-clear-annotations', data);
        });
    });

    // Rechargement forcé des écrans clients (utile après mise à jour du code)
    socket.on('admin-reload-clients', () => {
        console.log('🔄 Rechargement forcé des clients demandé par admin');
        displayClients.forEach(clientId => {
            io.to(clientId).emit('client-reload');
        });
    });

    // Listener pour les déconnexions
    socket.on('disconnect', () => {
        logEvent('INFO', 'Client Socket.IO déconnecté', { id: socket.id });
        sensorClients.delete(socket.id);
        displayClients.delete(socket.id);

        // Nettoyage agent système
        if (agentSocketIds.has(socket.id)) {
            agentSocketIds.delete(socket.id);
            for (const [screenId, agent] of knownAgents) {
                if (agent.socketId === socket.id) {
                    if (agent.status !== 'shutting-down' && agent.status !== 'rebooting') {
                        agent.status = 'offline';
                    }
                    agent.socketId = null;
                    logEvent('WARNING', '🤖 Agent système déconnecté', { screenId, status: agent.status });
                    break;
                }
            }
            broadcastAgentUpdate();
        }

        // Arrêter l'interval si aucun client n'est connecté
        if (sensorClients.size === 0 && sensorInterval) {
            clearInterval(sensorInterval);
            sensorInterval = null;
            logEvent('INFO', 'Arrêt de l\'envoi des données capteurs (aucun client)');
        }
    });
});

// Fonction pour diffuser les données des capteurs
async function broadcastSensorData() {
    try {
        const sensorData = await sensorsModule.readAllSensors();
        io.emit('sensor_data', sensorData);
    } catch (err) {
        logEvent('WARNING', 'Erreur lors de la lecture des capteurs', { message: err.message });
    }
}

// ===================== FIN INITIALISATION DES CAPTEURS =====================

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

// Route pour le client — pas de cache pour toujours servir la dernière version
app.get('/client/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// Route camera
app.get('/start-camera', (req, res) => {
    try {
        demarrerFluxCamera();
        res.json({ ok: true });
    } catch (err) {
        logEvent('ERROR', 'Impossible de démarrer le flux caméra', { message: err.message });
        res.status(500).json({
            ok: false,
            error: 'Le serveur n’a pas pu démarrer le flux caméra'
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
                let type = 'autre';
                if (extensionsVideos.includes(ext)) {
                    type = 'video';
                } else if (extensionsDocuments.includes(ext)) {
                    if (ext === '.pdf') {
                        type = 'application/pdf';
                    } else {
                        type = 'document';
                    }
                }
                
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
let selectionMediasDuration = {}; // {nom: dureeSecondes}

// Endpoint pour mettre à jour la sélection de médias
app.post('/api/selection', (req, res) => {
    const { fichiers } = req.body;
    if (!Array.isArray(fichiers)) {
        return res.status(400).json({ success: false, message: 'Format attendu: { fichiers: [ ... ] }' });
    }

    // Supporte une liste de string ou d'objet { nom, duration }
    const updatedSelection = [];

    fichiers.forEach(item => {
        if (typeof item === 'string') {
            updatedSelection.push(item);
            if (!selectionMediasDuration[item]) {
                selectionMediasDuration[item] = 10;
            }
        } else if (item && typeof item === 'object' && item.nom) {
            updatedSelection.push(item.nom);
            selectionMediasDuration[item.nom] = Number(item.duration) > 0 ? Number(item.duration) : 10;
        }
    });

    selectionMedias = [...new Set(updatedSelection)];

    // Supprimer les durée des fichiers non sélectionnés
    Object.keys(selectionMediasDuration).forEach(n => {
        if (!selectionMedias.includes(n)) delete selectionMediasDuration[n];
    });

    logEvent('INFO', 'Sélection de médias mise à jour', { selection: selectionMedias, durations: selectionMediasDuration });
    
    // Notifier les clients Raspberry via WebSocket
    broadcastMediasList();
    
    res.json({ success: true, selection: selectionMedias, durations: selectionMediasDuration });
});

// Endpoint pour obtenir la sélection courante (pour EduVision-Beta)
app.get('/api/medias', async (req, res) => {
    try {
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const fichiersInfos = [];
        for (const nom of selectionMedias) {
            if (nom === 'camera') {
                if (currentDisplayMode === 'camera') {
                    fichiersInfos.push({
                        nom: 'camera',
                        type: 'camera',
                        duration: selectionMediasDuration[nom] || 30,
                        url: '/camera-page.html'
                    });
                }
            } else {
                if (currentDisplayMode === 'documents') {
                    const cheminComplet = path.join(dossierFichiers, nom);
                    if (await fs.pathExists(cheminComplet)) {
                        const stats = await fs.stat(cheminComplet);
                        fichiersInfos.push({
                            nom,
                            taille: stats.size,
                            dateModification: stats.mtime,
                            duration: selectionMediasDuration[nom] || 10,
                            url: `/api/fichiers/lecture/${encodeURIComponent(nom)}`
                        });
                    }
                }
            }
        }
        res.json({ success: true, medias: fichiersInfos });
    } catch (error) {
        logEvent('ERROR', 'Erreur récupération sélection', { message: error.message });
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la sélection' });
    }
});

// Route pour uploader des fichiers
app.post('/api/upload', upload.array('files'), async (req, res) => {
    try {
        logEvent('INFO', 'Upload de fichiers', { nombre: req.files.length, ip: req.ip });
        const fichiersUploades = req.files.map(file => file.originalname);
        
        // Ajouter les fichiers uploadés à la sélection de manière unique
        selectionMedias = [...new Set([...selectionMedias, ...fichiersUploades])];
        fichiersUploades.forEach(nom => {
            if (!selectionMediasDuration[nom]) selectionMediasDuration[nom] = 10;
        });
        
        // 🔄 Vérifier s'il y a un PDF dans les fichiers uploadés
        let firstPdfFile = null;
        
        for (const nom of fichiersUploades) {
            if (nom.toLowerCase().endsWith('.pdf')) {
                firstPdfFile = nom;
                logEvent('INFO', '📄 PDF détecté dans l\'upload', { fichier: nom });
                
                // Estimer le nombre de pages du PDF
                totalPdfPages = await estimatePdfPages(nom);
                logEvent('INFO', 'Nombre de pages PDF estimé', { fichier: nom, pages: totalPdfPages });
                
                // Synchroniser le PDF aux clients Raspberry
                const success = setPdfPage(nom, 1);
                if (success) {
                    logEvent('SUCCESS', '✅ PDF synchronisé avec les clients', { fichier: nom, page: 1, totalPages: totalPdfPages });
                } else {
                    logEvent('WARNING', '⚠️ Impossible de synchroniser le PDF', { fichier: nom });
                }
                break; // On traite que le premier PDF
            }
        }
        
        // S'assurer que la page d'affichage est 'documents' pour que les clients voient le PDF ou les médias
        if (firstPdfFile) {
            setDisplayPage('documents');
        }
        
        // Notifier tous les clients Raspberry de la nouvelle sélection de médias
        broadcastMediasList();
        
        logEvent('SUCCESS', 'Fichiers uploadés et ajoutés à la sélection', { 
            fichiers: fichiersUploades,
            selectionTotale: selectionMedias.length,
            pdfSynchronisé: firstPdfFile ? firstPdfFile : 'aucun',
            durations: selectionMediasDuration
        });
        
        res.json({ 
            success: true, 
            fichiers: fichiersUploades,
            selection: selectionMedias,
            pdfSynchronisé: firstPdfFile
        });
    } catch (error) {
        logEvent('ERROR', 'Erreur upload fichiers', { message: error.message });
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload des fichiers' });
    }
});

// Route pour supprimer un fichier
app.delete('/api/fichiers/:nomFichier', async (req, res) => {
    try {
        const nomFichier = decodeURIComponent(req.params.nomFichier);
        logEvent('INFO', 'Suppression fichier', { fichier: nomFichier });
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        const cheminFichier = path.join(dossierFichiers, nomFichier);
        
        if (!await fs.pathExists(cheminFichier)) {
            logEvent('WARNING', 'Fichier non trouvé pour suppression', { fichier: nomFichier });
            return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
        }
        
        await fs.unlink(cheminFichier);
        
        // Retirer de la sélection si présent
        selectionMedias = selectionMedias.filter(f => f !== nomFichier);
        
        logEvent('SUCCESS', 'Fichier supprimé', { fichier: nomFichier });
        res.json({ success: true });
    } catch (error) {
        logEvent('ERROR', 'Erreur suppression fichier', { message: error.message });
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression du fichier' });
    }
});

// Endpoint pour les logs du client
app.post('/api/log', (req, res) => {
    const { level, message, details } = req.body;
    logEvent(level || 'INFO', `[CLIENT] ${message}`, details);
    res.json({ success: true });
});

// Endpoint de diagnostic pour la Raspberry Pi
app.get('/api/status', (req, res) => {
    const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
    res.json({
        success: true,
        status: 'online',
        server: {
            port: PORT,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        },
        medias: {
            selected: selectionMedias.length,
            items: selectionMedias
        },
        storage: {
            folder: dossierFichiers
        }
    });
});

// Endpoint pour synchroniser et auto-sélectionner les fichiers
app.post('/api/sync', async (req, res) => {
    try {
        logEvent('INFO', 'Synchronisation des fichiers depuis la Raspberry Pi');
        const dossierFichiers = process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers');
        
        // Lister tous les fichiers
        const fichiers = await fs.readdir(dossierFichiers);
        logEvent('DEBUG', `Fichiers trouvés: ${fichiers.length}`, { fichiers });
        const fichiersCandidats = [];
        
        // Extensions supportées
        const extensionsDocuments = ['.pdf', '.doc', '.docx', '.txt', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'];
        const extensionsVideos = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];
        const extensionsImages = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        
        for (const fichier of fichiers) {
            const cheminComplet = path.join(dossierFichiers, fichier);
            try {
                const stats = await fs.stat(cheminComplet);
                
                if (stats.isFile()) {
                    const ext = path.extname(fichier).toLowerCase();
                    logEvent('DEBUG', `Vérification extension: ${fichier} -> ${ext}`);
                    
                    // Vérifier que c'est un type de fichier supporté
                    if ([...extensionsDocuments, ...extensionsVideos, ...extensionsImages].includes(ext)) {
                        fichiersCandidats.push(fichier);
                        logEvent('DEBUG', `Fichier accepté: ${fichier}`);
                    } else {
                        logEvent('DEBUG', `Fichier rejeté (extension non supportée): ${fichier}`);
                    }
                }
            } catch (err) {
                logEvent('DEBUG', `Erreur lecture fichier: ${fichier}`, { error: err.message });
            }
        }
        
        // Mettre à jour la sélection
        selectionMedias = fichiersCandidats;
        
        logEvent('SUCCESS', 'Synchronisation complète', { 
            nombreFichiers: fichiersCandidats.length,
            fichiers: fichiersCandidats
        });
        
        res.json({ 
            success: true, 
            medias: fichiersCandidats.map(nom => ({
                nom,
                url: `/api/fichiers/lecture/${encodeURIComponent(nom)}`
            }))
        });
    } catch (error) {
        logEvent('ERROR', 'Erreur synchronisation', { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Erreur lors de la synchronisation' });
    }
});

// ===================== ROUTES DES CAPTEURS =====================
// Route GET pour récupérer les données actuelles des capteurs
app.get('/api/sensors', async (req, res) => {
    try {
        logEvent('INFO', 'Appel API capteurs');
        const sensorData = await sensorsModule.readAllSensors();
        logEvent('SUCCESS', 'Données capteurs récupérées', {
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            air_quality: sensorData.air_quality
        });
        res.json({
            success: true,
            data: sensorData
        });
    } catch (err) {
        logEvent('ERROR', 'Erreur API capteurs', { message: err.message });
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la lecture des capteurs',
            error: err.message
        });
    }
});

// Route POST pour activer/désactiver la transmission Socket.IO des capteurs
app.post('/api/sensors/subscribe', (req, res) => {
    logEvent('INFO', 'Demande d\'activation de la transmission des capteurs');
    
    // Si l'interval n'existe pas, le démarrer
    if (!sensorInterval && sensorClients.size > 0) {
        sensorInterval = setInterval(broadcastSensorData, 1000); // Envoyer toutes les secondes
        logEvent('INFO', 'Transmission des capteurs activée');
    }
    
    res.json({ success: true, message: 'Transmission des capteurs activée' });
});

// Route POST pour désactiver la transmission Socket.IO des capteurs
app.post('/api/sensors/unsubscribe', (req, res) => {
    logEvent('INFO', 'Demande de désactivation de la transmission des capteurs');
    
    if (sensorInterval) {
        clearInterval(sensorInterval);
        sensorInterval = null;
        logEvent('INFO', 'Transmission des capteurs désactivée');
    }
    
    res.json({ success: true, message: 'Transmission des capteurs désactivée' });
});

// ===================== FIN ROUTES DES CAPTEURS =====================

// Gérer les erreurs d'écoute (ex: EADDRINUSE)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logEvent('ERROR', `Port ${PORT} déjà utilisé : supprimer l'instance existante ou changer de port`);
        console.error(`Port ${PORT} déjà utilisé (EADDRINUSE).`);
        process.exit(1);
    } else {
        logEvent('ERROR', 'Erreur serveur non gérée', { message: err.message, code: err.code });
        console.error('Erreur serveur non gérée :', err);
        process.exit(1);
    }
});

// API pour gérer le mode d'affichage des clients
// Endpoint utilisé par les clients pour détecter un redémarrage serveur et se recharger
app.get('/api/server-time', (_req, res) => {
    res.json({ startTime: SERVER_START_TIME });
});

// Endpoint de diagnostic : affiche l'état en temps réel (clients connectés, PDF actuel, etc.)
app.get('/api/diag', (_req, res) => {
    res.json({
        displayClientsCount: displayClients.size,
        displayClientIds: [...displayClients],
        currentPdfFile,
        currentPdfPage,
        totalPdfPages,
        pdfZoomLevel,
        currentDisplayPage,
        serverStartTime: SERVER_START_TIME
    });
});

app.get('/api/display-mode', (req, res) => {
    res.json({
        success: true,
        mode: currentDisplayMode
    });
});

app.post('/api/display-mode', express.json(), (req, res) => {
    const { mode } = req.body;
    if (mode === 'documents' || mode === 'camera') {
        // Changer le mode => appliquer la page correspondante aux clients
        if (setDisplayPage(mode)) {
            logEvent('INFO', 'Mode d\'affichage changé', { mode });
            res.json({ success: true, mode });
            return;
        }
    }
    res.status(400).json({ success: false, message: 'Mode invalide' });
});

app.get('/api/display-page', (req, res) => {
    res.json({
        success: true,
        page: currentDisplayPage,
        mode: currentDisplayMode
    });
});

app.post('/api/display-page', express.json(), (req, res) => {
    const { page } = req.body;
    if (page && setDisplayPage(String(page))) {
        res.json({ success: true, page: currentDisplayPage, mode: currentDisplayMode });
    } else {
        res.status(400).json({ success: false, message: 'Page d\'affichage invalide' });
    }
});

// API pour la synchronisation PDF
app.get('/api/pdf/status', (req, res) => {
    res.json({
        success: true,
        file: currentPdfFile,
        page: currentPdfPage,
        totalPages: totalPdfPages
    });
});

app.post('/api/pdf/page', express.json(), async (req, res) => {
    console.log('📨 Route POST /api/pdf/page reçue');
    console.log('   Headers:', req.headers);
    console.log('   Body:', JSON.stringify(req.body));
    
    const { file, page } = req.body;
    console.log('   Extraction: file =', JSON.stringify(file), ', page =', page, ', type page:', typeof page);
    
    if (!file) {
        console.log('❌ Pas de fichier dans la requête');
        return res.status(400).json({ success: false, message: 'Pas de fichier' });
    }
    
    const pageInt = parseInt(page);
    console.log('   pageInt parsed:', pageInt);
    
    // Estimer le nombre de pages pour ce PDF
    totalPdfPages = await estimatePdfPages(file);
    console.log('   Pages estimées:', totalPdfPages);
    
    // Forcer la page d'affichage des clients à 'documents'
    setDisplayPage('documents');
    
    if (setPdfPage(file, pageInt)) {
        console.log('✅ PDF page set successfully! Réponse:', { success: true, file: currentPdfFile, page: currentPdfPage, totalPages: totalPdfPages });
        res.json({ success: true, file: currentPdfFile, page: currentPdfPage, totalPages: totalPdfPages });
    } else {
        console.log('❌ Échec de setPdfPage');
        res.status(400).json({ success: false, message: 'Page PDF invalide' });
    }
});

app.post('/api/pdf/next', (req, res) => {
    if (currentPdfFile && currentPdfPage < totalPdfPages) {
        setPdfPage(currentPdfFile, currentPdfPage + 1);
        res.json({ success: true, file: currentPdfFile, page: currentPdfPage, totalPages: totalPdfPages });
    } else {
        res.status(400).json({ success: false, message: 'Impossible d\'avancer' });
    }
});

app.post('/api/pdf/prev', (req, res) => {
    if (currentPdfFile && currentPdfPage > 1) {
        setPdfPage(currentPdfFile, currentPdfPage - 1);
        res.json({ success: true, file: currentPdfFile, page: currentPdfPage, totalPages: totalPdfPages });
    } else {
        res.status(400).json({ success: false, message: 'Impossible de reculer' });
    }
});

// ===================== API CONTRÔLE SYSTÈME =====================

// Liste des agents connectés
app.get('/api/system/agents', (_req, res) => {
    res.json({ success: true, agents: [...knownAgents.values()] });
});

// Envoi d'une commande système via HTTP (fallback)
app.post('/api/system/command', express.json(), (req, res) => {
    const { command, target } = req.body;
    if (!ALLOWED_SYSTEM_COMMANDS.includes(command)) {
        return res.status(400).json({ success: false, message: 'Commande non autorisée' });
    }

    let targetAgents = [];
    const t = target || 'all';
    if (t === 'all') {
        targetAgents = [...knownAgents.values()].filter(a => a.socketId);
    } else if (typeof t === 'string') {
        const a = knownAgents.get(t);
        if (a && a.socketId) targetAgents = [a];
    }

    if (targetAgents.length === 0) {
        return res.status(404).json({ success: false, message: 'Aucun agent disponible' });
    }

    const commandId = Date.now().toString(36);
    targetAgents.forEach(agent => {
        io.to(agent.socketId).emit('system-command', { commandId, command });
    });

    logEvent('INFO', `⚙️ Commande HTTP système`, { command, targets: targetAgents.map(a => a.screenId) });
    res.json({ success: true, commandId, count: targetAgents.length });
});

// ===================== FIN API CONTRÔLE SYSTÈME =====================

// Démarrer le serveur
server.listen(PORT, () => {
    logEvent('SUCCESS', `Serveur démarré sur http://localhost:${PORT}`);
    logEvent('INFO', `Dossier fichiers: ${process.env.DOSSIER_FICHIERS || path.join(__dirname, 'fichiers')}`);
    logEvent('INFO', `Logs sauvegardés dans: ${logsDir}`);
    logEvent('INFO', 'Socket.IO initialisé pour la transmission des capteurs');
    
    // Démarrer la transmission automatique si des clients sont connectés
    // Note: Premier client déclenchera l'interval
    const checkClients = setInterval(() => {
        if (sensorClients.size > 0 && !sensorInterval) {
            sensorInterval = setInterval(broadcastSensorData, 1000);
            logEvent('INFO', 'Transmission automatique des capteurs activée');
            clearInterval(checkClients);
        }
    }, 100);
});

