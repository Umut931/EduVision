'use strict';

/**
 * EduVision — Panneau de contrôle système admin
 * Gestion des Raspberry Pi (clients + serveur central) depuis l'interface web.
 */

// ── État global ───────────────────────────────────────────────────────────────
let scAgents = []; // liste courante des agents
let scListenersInitialized = false;
let scCommandLog = []; // historique des commandes (max 50)
let scPendingConfirm = null; // callback de confirmation en attente

const SC_STATUS_LABELS = {
    online:        { label: 'En ligne',       color: '#27ae60', dot: true  },
    offline:       { label: 'Hors ligne',     color: '#e74c3c', dot: true  },
    sleeping:      { label: 'Veille écran',   color: '#f39c12', dot: true  },
    'shutting-down': { label: 'Arrêt…',       color: '#e67e22', dot: true, spin: true },
    rebooting:     { label: 'Redémarrage…',   color: '#3498db', dot: true, spin: true },
    waking:        { label: 'Réveil…',        color: '#9b59b6', dot: true, spin: true },
    error:         { label: 'Erreur',         color: '#c0392b', dot: true  },
};

const SC_COMMAND_LABELS = {
    'shutdown':   'Arrêt',
    'reboot':     'Redémarrage',
    'screen-off': 'Écran OFF',
    'screen-on':  'Écran ON',
};

// ── Initialisation des listeners WebSocket ────────────────────────────────────
function initSystemControl() {
    if (scListenersInitialized) return;
    scListenersInitialized = true;

    if (!adminSocket) return;

    adminSocket.on('system-agents-update', (agents) => {
        scAgents = agents || [];
        _updateAgentsGrid();
        _updateAgentCount();
    });

    adminSocket.on('system-command-result', (data) => {
        _logCommand(data);
        _updateCommandLog();
        if (data.success) {
            _showToast(`✅ ${data.screenId}: ${SC_COMMAND_LABELS[data.command] || data.command} OK`, 'success');
        } else {
            _showToast(`❌ ${data.screenId}: ${data.message}`, 'error');
        }
    });

    adminSocket.on('system-command-sent', (data) => {
        _showToast(`📤 Commande envoyée à ${data.count} agent(s)`, 'info');
    });

    adminSocket.on('system-command-error', (data) => {
        _showToast(`❌ ${data.message}`, 'error');
    });
}

// ── Ouverture du panneau ──────────────────────────────────────────────────────
function afficherSystemControl() {
    entrerModePleinEcran('⚙️ Contrôle Système Raspberry Pi');
    initSystemControl();

    const contenu = document.getElementById('contenu-plein-ecran');
    contenu.innerHTML = _buildPanelHTML();

    // Attacher les handlers de boutons
    _bindButtons();

    // Charger la liste initiale via HTTP (en cas de reconnexion)
    fetch('/api/system/agents')
        .then(r => r.json())
        .then(data => {
            if (data.agents) {
                scAgents = data.agents;
                _updateAgentsGrid();
                _updateAgentCount();
            }
        })
        .catch(() => { /* silencieux — la liste sera mise à jour par WebSocket */ });
}

// ── Construction du HTML du panneau ──────────────────────────────────────────
function _buildPanelHTML() {
    return `
<div class="sc-container" id="sc-panel">

    <!-- ─ Pi Centrale ─────────────────────────────────────── -->
    <div class="sc-section">
        <div class="sc-section-header">
            <h3 class="sc-section-title">🖥️ Raspberry Pi Centrale (Serveur)</h3>
            <span class="sc-badge sc-badge-warning">⚠️ Arrêter le serveur déconnecte tous les clients</span>
        </div>
        <div class="sc-actions-row">
            <button class="sc-btn sc-btn-screen" id="sc-central-screen-off"
                    onclick="centralCommand('screen-off')" title="Éteindre l'écran du serveur">
                🌙 Écran OFF
            </button>
            <button class="sc-btn sc-btn-screen" id="sc-central-screen-on"
                    onclick="centralCommand('screen-on')" title="Allumer l'écran du serveur">
                ☀️ Écran ON
            </button>
            <button class="sc-btn sc-btn-reboot" id="sc-central-reboot"
                    onclick="scConfirm('Redémarrer le serveur central ? Les clients vont se déconnecter brièvement.', () => centralCommand(\'reboot\'))">
                🔄 Redémarrer
            </button>
            <button class="sc-btn sc-btn-danger" id="sc-central-shutdown"
                    onclick="scConfirm('⚠️ Éteindre le serveur central ? Tous les clients perdront définitivement la connexion.', () => centralCommand(\'shutdown\'))">
                ⏻ Éteindre
            </button>
        </div>
    </div>

    <!-- ─ Actions globales ────────────────────────────────── -->
    <div class="sc-section">
        <div class="sc-section-header">
            <h3 class="sc-section-title">📡 Actions globales — Tous les clients</h3>
            <span id="sc-agent-count" class="sc-agent-count-badge">0 agent(s)</span>
        </div>
        <div class="sc-actions-row">
            <button class="sc-btn sc-btn-screen" onclick="globalCommand('screen-off')">
                🌙 Écran OFF (tous)
            </button>
            <button class="sc-btn sc-btn-screen" onclick="globalCommand('screen-on')">
                ☀️ Écran ON (tous)
            </button>
            <button class="sc-btn sc-btn-reboot"
                    onclick="scConfirm('Redémarrer TOUS les clients Raspberry Pi ?', () => globalCommand(\'reboot\'))">
                🔄 Redémarrer (tous)
            </button>
            <button class="sc-btn sc-btn-danger"
                    onclick="scConfirm('⚠️ Éteindre TOUS les clients Raspberry Pi ?', () => globalCommand(\'shutdown\'))">
                ⏻ Éteindre (tous)
            </button>
        </div>
    </div>

    <!-- ─ Agents individuels ──────────────────────────────── -->
    <div class="sc-section">
        <div class="sc-section-header">
            <h3 class="sc-section-title">🤖 Agents connectés</h3>
            <div class="sc-section-header-actions">
                <span id="sc-agent-count2" class="sc-agent-count-badge">0 agent(s)</span>
                <button class="sc-btn sc-btn-sm sc-btn-refresh" onclick="refreshAgents()">↺ Actualiser</button>
            </div>
        </div>
        <div id="sc-agents-grid" class="sc-agents-grid">
            <p class="sc-empty-msg">Aucun agent système connecté.</p>
        </div>
        <div class="sc-wake-notice">
            ℹ️ <strong>Réveil réseau (Wake-on-LAN)</strong> : non supporté nativement sur Raspberry Pi Wi-Fi.
            Le bouton <em>Écran ON</em> fonctionne uniquement si le Pi est <strong>déjà allumé</strong> (écran en veille).
            Après un arrêt complet, le Pi doit être rallumé physiquement.
        </div>
    </div>

    <!-- ─ Historique des commandes ────────────────────────── -->
    <div class="sc-section">
        <h3 class="sc-section-title">📋 Historique des commandes</h3>
        <div id="sc-command-log" class="sc-command-log">
            <p class="sc-empty-msg">Aucune commande envoyée.</p>
        </div>
    </div>

</div>

<!-- ─ Modal de confirmation ─────────────────────────────── -->
<div id="sc-confirm-overlay" class="sc-confirm-overlay" style="display:none;" onclick="scCancelConfirm()">
    <div class="sc-confirm-box" onclick="event.stopPropagation()">
        <p id="sc-confirm-msg" class="sc-confirm-text"></p>
        <div class="sc-confirm-buttons">
            <button class="sc-btn sc-btn-danger" id="sc-confirm-yes" onclick="scDoConfirm()">Confirmer</button>
            <button class="sc-btn sc-btn-cancel" onclick="scCancelConfirm()">Annuler</button>
        </div>
    </div>
</div>

<!-- ─ Toast ─────────────────────────────────────────────── -->
<div id="sc-toast" class="sc-toast" role="alert" aria-live="polite"></div>
`;
}

// ── Rendu de la grille d'agents ──────────────────────────────────────────────
function _buildAgentCard(agent) {
    const st = SC_STATUS_LABELS[agent.status] || { label: agent.status, color: '#888', dot: false };
    const isOnline = agent.socketId !== null;
    const lastSeen = agent.lastSeen
        ? new Date(agent.lastSeen).toLocaleTimeString('fr-FR')
        : 'Jamais';

    const dotClass = st.spin ? 'sc-dot sc-dot-spin' : 'sc-dot';
    const canCommand = isOnline;

    return `
<div class="sc-agent-card" data-screen="${agent.screenId}">
    <div class="sc-agent-header">
        <div class="sc-agent-info">
            <span class="sc-agent-name">${agent.screenId}</span>
            <span class="sc-agent-hostname">${agent.hostname || ''}</span>
        </div>
        <div class="sc-status-badge" style="--status-color: ${st.color}">
            <span class="${dotClass}" style="background: ${st.color};"></span>
            ${st.label}
        </div>
    </div>
    <div class="sc-agent-meta">
        <span title="Adresse IP">🌐 ${agent.ip}</span>
        <span title="Dernière activité">⏱ ${lastSeen}</span>
    </div>
    <div class="sc-agent-actions">
        <button class="sc-btn sc-btn-sm sc-btn-screen"
                onclick="agentCommand('${agent.screenId}', 'screen-off')"
                ${canCommand ? '' : 'disabled'} title="Éteindre l'écran">
            🌙 OFF
        </button>
        <button class="sc-btn sc-btn-sm sc-btn-screen"
                onclick="agentCommand('${agent.screenId}', 'screen-on')"
                ${canCommand ? '' : 'disabled'} title="Allumer l'écran">
            ☀️ ON
        </button>
        <button class="sc-btn sc-btn-sm sc-btn-reboot"
                onclick="scConfirm('Redémarrer ${agent.screenId} ?', () => agentCommand(\'${agent.screenId}\', \'reboot\'))"
                ${canCommand ? '' : 'disabled'} title="Redémarrer">
            🔄
        </button>
        <button class="sc-btn sc-btn-sm sc-btn-danger"
                onclick="scConfirm('Éteindre ${agent.screenId} ?', () => agentCommand(\'${agent.screenId}\', \'shutdown\'))"
                ${canCommand ? '' : 'disabled'} title="Éteindre">
            ⏻
        </button>
    </div>
</div>`;
}

function _updateAgentsGrid() {
    const grid = document.getElementById('sc-agents-grid');
    if (!grid) return;

    if (scAgents.length === 0) {
        grid.innerHTML = '<p class="sc-empty-msg">Aucun agent système connecté.</p>';
        return;
    }

    // Tri : online d'abord, puis par screenId
    const sorted = [...scAgents].sort((a, b) => {
        const oa = a.socketId ? 0 : 1;
        const ob = b.socketId ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return a.screenId.localeCompare(b.screenId);
    });

    grid.innerHTML = sorted.map(_buildAgentCard).join('');
}

function _updateAgentCount() {
    const online = scAgents.filter(a => a.socketId).length;
    const total  = scAgents.length;
    const text   = `${online}/${total} agent(s) connecté(s)`;
    const el1 = document.getElementById('sc-agent-count');
    const el2 = document.getElementById('sc-agent-count2');
    if (el1) el1.textContent = text;
    if (el2) el2.textContent = text;
}

// ── Actions sur les agents ────────────────────────────────────────────────────
function agentCommand(screenId, command) {
    if (!adminSocket) { _showToast('❌ WebSocket non disponible', 'error'); return; }
    adminSocket.emit('admin-system-command', { target: screenId, command });
}

function globalCommand(command) {
    if (!adminSocket) { _showToast('❌ WebSocket non disponible', 'error'); return; }
    adminSocket.emit('admin-system-command', { target: 'all', command });
}

function centralCommand(command) {
    if (!adminSocket) { _showToast('❌ WebSocket non disponible', 'error'); return; }
    adminSocket.emit('admin-central-command', { command });
    _showToast(`📤 Commande centrale: ${SC_COMMAND_LABELS[command] || command}`, 'info');
}

function refreshAgents() {
    fetch('/api/system/agents')
        .then(r => r.json())
        .then(data => {
            if (data.agents) {
                scAgents = data.agents;
                _updateAgentsGrid();
                _updateAgentCount();
                _showToast('↺ Liste actualisée', 'info');
            }
        })
        .catch(() => _showToast('❌ Impossible de contacter le serveur', 'error'));
}

// ── Confirmation modale ───────────────────────────────────────────────────────
function scConfirm(message, callback) {
    scPendingConfirm = callback;
    const overlay = document.getElementById('sc-confirm-overlay');
    const msg     = document.getElementById('sc-confirm-msg');
    if (!overlay || !msg) {
        // Si le panneau n'est pas ouvert, exécuter directement
        callback();
        return;
    }
    msg.textContent = message;
    overlay.style.display = 'flex';
}

function scDoConfirm() {
    document.getElementById('sc-confirm-overlay').style.display = 'none';
    if (typeof scPendingConfirm === 'function') {
        scPendingConfirm();
        scPendingConfirm = null;
    }
}

function scCancelConfirm() {
    document.getElementById('sc-confirm-overlay').style.display = 'none';
    scPendingConfirm = null;
}

// ── Historique des commandes ─────────────────────────────────────────────────
function _logCommand(data) {
    scCommandLog.unshift({
        time: new Date().toLocaleTimeString('fr-FR'),
        screenId: data.screenId,
        command:  data.command,
        success:  data.success,
        message:  data.message,
    });
    if (scCommandLog.length > 50) scCommandLog.pop();
}

function _updateCommandLog() {
    const el = document.getElementById('sc-command-log');
    if (!el) return;
    if (scCommandLog.length === 0) {
        el.innerHTML = '<p class="sc-empty-msg">Aucune commande envoyée.</p>';
        return;
    }
    el.innerHTML = scCommandLog.map(e => `
        <div class="sc-log-entry ${e.success ? 'sc-log-ok' : 'sc-log-err'}">
            <span class="sc-log-time">${e.time}</span>
            <span class="sc-log-screen">${e.screenId}</span>
            <span class="sc-log-cmd">${SC_COMMAND_LABELS[e.command] || e.command}</span>
            <span class="sc-log-msg">${e.success ? '✅' : '❌'} ${e.message}</span>
        </div>
    `).join('');
}

// ── Toast notifications ──────────────────────────────────────────────────────
let _toastTimer = null;
function _showToast(msg, type = 'info') {
    const el = document.getElementById('sc-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `sc-toast sc-toast-${type} sc-toast-visible`;
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
        el.classList.remove('sc-toast-visible');
    }, 3500);
}

// ── Bindings des boutons globaux ─────────────────────────────────────────────
function _bindButtons() {
    // Les handlers sont déjà inline dans le HTML — rien à faire ici
}
