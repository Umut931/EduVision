#!/usr/bin/env node
'use strict';

/**
 * EduVision System Agent
 * Process Node.js companion tournant sur chaque Raspberry Pi client.
 * Se connecte au serveur central, reçoit les commandes système et les exécute.
 *
 * Commandes supportées: shutdown, reboot, screen-off, screen-on
 * Sécurité: liste blanche stricte, spawn sans shell, aucune injection possible.
 */

const { io } = require('socket.io-client');
const { spawn } = require('child_process');
const os = require('os');

// ── Configuration ─────────────────────────────────────────────────────────────
const SERVER_URL  = process.env.SERVER_URL  || 'http://192.168.1.100:3000';
const SCREEN_ID   = process.env.SCREEN_ID   || 'screen1';
const DISPLAY_ENV = process.env.DISPLAY     || ':0';
const HEARTBEAT_MS = 30_000;

// ── Commandes autorisées (liste blanche) ─────────────────────────────────────
// Chaque commande est un tableau de candidats essayés dans l'ordre.
// Chaque candidat = { file, args } — spawn sans shell, aucune injection possible.
const COMMANDS = {
    'shutdown': [
        { file: 'sudo', args: ['/sbin/shutdown', '-h', 'now'] },
        { file: 'sudo', args: ['shutdown',       '-h', 'now'] },
    ],
    'reboot': [
        { file: 'sudo', args: ['/sbin/reboot'] },
        { file: 'sudo', args: ['reboot'] },
    ],
    'screen-off': [
        // RPi 4 et antérieur (firmware VideoCore)
        { file: '/usr/bin/vcgencmd', args: ['display_power', '0'] },
        // X11 (Raspberry Pi OS Bullseye et antérieur)
        { file: 'xset', args: ['-display', DISPLAY_ENV, 'dpms', 'force', 'off'] },
        // Wayland / RPi 5
        { file: 'wlr-randr', args: ['--output', 'HDMI-A-1', '--off'] },
    ],
    'screen-on': [
        { file: '/usr/bin/vcgencmd', args: ['display_power', '1'] },
        { file: 'xset', args: ['-display', DISPLAY_ENV, 'dpms', 'force', 'on'] },
        { file: 'wlr-randr', args: ['--output', 'HDMI-A-1', '--on'] },
    ],
};

// ── État ──────────────────────────────────────────────────────────────────────
let currentStatus     = 'online';
let commandInProgress = false;
let heartbeatTimer    = null;

// ── Utilitaires ───────────────────────────────────────────────────────────────
function log(level, message, details) {
    const ts = new Date().toLocaleString('fr-FR');
    const extra = details ? ' | ' + JSON.stringify(details) : '';
    const colors = { INFO: '\x1b[36m', SUCCESS: '\x1b[32m', WARNING: '\x1b[33m', ERROR: '\x1b[31m' };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}[${ts}] [${level}] [${SCREEN_ID}] ${message}${extra}${reset}`);
}

function getLocalIp() {
    for (const ifaces of Object.values(os.networkInterfaces())) {
        for (const iface of ifaces) {
            if (!iface.internal && iface.family === 'IPv4') return iface.address;
        }
    }
    return 'unknown';
}

/**
 * Essaie chaque candidat de la liste dans l'ordre.
 * S'arrête au premier succès ou renvoie l'erreur du dernier.
 */
function tryCommandsInSequence(candidates, env, callback) {
    const [first, ...rest] = candidates;

    log('INFO', `Tentative: ${first.file} ${first.args.join(' ')}`);

    const proc = spawn(first.file, first.args, {
        env,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', (code) => {
        if (code === 0) {
            log('SUCCESS', `Commande réussie: ${first.file}`, { stdout: stdout.trim() || undefined });
            callback(null, { stdout: stdout.trim(), command: first });
        } else if (rest.length > 0) {
            log('WARNING', `Échec (code ${code}): ${first.file} — essai suivant`, { stderr: stderr.trim() });
            tryCommandsInSequence(rest, env, callback);
        } else {
            const msg = stderr.trim() || `Code de sortie ${code}`;
            callback(new Error(`Toutes les alternatives ont échoué. Dernière erreur: ${msg}`), null);
        }
    });

    proc.on('error', (err) => {
        // Binaire introuvable — essayer le suivant
        if (rest.length > 0) {
            log('WARNING', `Erreur lancement ${first.file}: ${err.message} — essai suivant`);
            tryCommandsInSequence(rest, env, callback);
        } else {
            callback(new Error(`Impossible de lancer une commande. Dernière erreur: ${err.message}`), null);
        }
    });
}

// ── Gestion des commandes reçues ──────────────────────────────────────────────
function handleCommand(socket, data) {
    const { commandId, command } = data || {};

    if (!COMMANDS[command]) {
        log('ERROR', `Commande inconnue: ${command}`);
        socket.emit('system-command-result', {
            commandId, command, screenId: SCREEN_ID,
            success: false, message: `Commande inconnue: ${command}`,
        });
        return;
    }

    if (commandInProgress) {
        log('WARNING', `Commande ignorée — déjà en cours`, { command });
        socket.emit('system-command-result', {
            commandId, command, screenId: SCREEN_ID,
            success: false, message: 'Une commande est déjà en cours d\'exécution',
        });
        return;
    }

    commandInProgress = true;
    log('INFO', `Exécution de la commande: ${command}`, { commandId });

    // Mise à jour du statut avant exécution
    if (command === 'shutdown')  currentStatus = 'shutting-down';
    if (command === 'reboot')    currentStatus = 'rebooting';
    if (command === 'screen-off') currentStatus = 'sleeping';
    if (command === 'screen-on')  currentStatus = 'waking';

    socket.emit('agent-status-update', { screenId: SCREEN_ID, status: currentStatus });

    const env = {
        ...process.env,
        DISPLAY: DISPLAY_ENV,
        XAUTHORITY: `/home/${os.userInfo().username}/.Xauthority`,
    };

    const isDestructive = command === 'shutdown' || command === 'reboot';

    if (isDestructive) {
        // Envoyer l'acquittement AVANT l'exécution (la connexion va mourir)
        socket.emit('system-command-result', {
            commandId, command, screenId: SCREEN_ID,
            success: true, message: `Commande ${command} initiée`,
        });

        // Courte pause pour laisser le temps à l'ACK d'être transmis
        setTimeout(() => {
            commandInProgress = false;
            tryCommandsInSequence(COMMANDS[command], env, (err) => {
                if (err) log('ERROR', `Erreur lors de l'exécution de ${command}`, { error: err.message });
            });
        }, 800);

    } else {
        tryCommandsInSequence(COMMANDS[command], env, (err, result) => {
            commandInProgress = false;

            if (err) {
                currentStatus = 'error';
                log('ERROR', `Erreur commande ${command}`, { error: err.message });
                socket.emit('system-command-result', {
                    commandId, command, screenId: SCREEN_ID,
                    success: false, message: err.message,
                });
            } else {
                if (command === 'screen-on')  currentStatus = 'online';
                if (command === 'screen-off') currentStatus = 'sleeping';

                socket.emit('system-command-result', {
                    commandId, command, screenId: SCREEN_ID,
                    success: true, message: 'OK',
                });
                socket.emit('agent-status-update', { screenId: SCREEN_ID, status: currentStatus });
            }
        });
    }
}

// ── Connexion au serveur ──────────────────────────────────────────────────────
function connectToServer() {
    log('INFO', `Connexion au serveur: ${SERVER_URL}`);

    const socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionDelay:    2_000,
        reconnectionDelayMax: 30_000,
        reconnectionAttempts: Infinity,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        currentStatus = 'online';
        log('SUCCESS', `Connecté au serveur`, { socketId: socket.id });

        socket.emit('register-system-agent', {
            screenId: SCREEN_ID,
            ip:       getLocalIp(),
            hostname: os.hostname(),
            platform: os.platform(),
            arch:     os.arch(),
        });

        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
            socket.emit('agent-heartbeat', {
                screenId: SCREEN_ID,
                status:   currentStatus,
                uptime:   Math.floor(process.uptime()),
                timestamp: Date.now(),
            });
        }, HEARTBEAT_MS);
    });

    socket.on('agent-registered', (data) => {
        log('SUCCESS', `Agent enregistré sur le serveur`, data);
    });

    socket.on('system-command', (data) => {
        log('INFO', `Commande reçue du serveur`, { command: data?.command, id: data?.commandId });
        handleCommand(socket, data);
    });

    socket.on('disconnect', (reason) => {
        log('WARNING', `Déconnecté du serveur`, { reason });
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    });

    socket.on('connect_error', (err) => {
        log('ERROR', `Erreur de connexion`, { message: err.message });
    });

    socket.on('reconnect', (attempt) => {
        log('INFO', `Reconnecté après ${attempt} tentative(s)`);
    });

    return socket;
}

// ── Démarrage ─────────────────────────────────────────────────────────────────
log('INFO', '════════════════════════════════════════');
log('INFO', ' EduVision System Agent — Démarrage');
log('INFO', `  Serveur : ${SERVER_URL}`);
log('INFO', `  Écran   : ${SCREEN_ID}`);
log('INFO', `  Hôte    : ${os.hostname()} (${getLocalIp()})`);
log('INFO', `  OS      : ${os.platform()} ${os.arch()}`);
log('INFO', '════════════════════════════════════════');

connectToServer();
