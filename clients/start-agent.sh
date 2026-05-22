#!/bin/bash
# EduVision System Agent — Script de démarrage
# Ce script démarre l'agent système sur le Raspberry Pi client.
# Il doit tourner EN PARALLÈLE du script start-client.sh (Chromium).

set -e

# ── Configuration ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${HOME}/EduVision-client/config/client.conf"

# Charger la configuration si disponible
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

SERVER_IP="${SERVER_IP:-192.168.1.100}"
SERVER_PORT="${SERVER_PORT:-3000}"
SCREEN_ID="${SCREEN_ID:-screen1}"
LOG_DIR="${HOME}/EduVision-client/logs"
LOG_FILE="${LOG_DIR}/system-agent.log"

mkdir -p "$LOG_DIR"

export SERVER_URL="http://${SERVER_IP}:${SERVER_PORT}"
export SCREEN_ID="${SCREEN_ID}"
export DISPLAY="${DISPLAY:-:0}"

echo "=== EduVision System Agent ==="
echo "Serveur : ${SERVER_URL}"
echo "Écran ID: ${SCREEN_ID}"
echo "Log     : ${LOG_FILE}"
echo "================================"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js n'est pas installé."
    echo "Installez-le avec: sudo apt install -y nodejs"
    exit 1
fi

# Vérifier socket.io-client
AGENT_MODULES="${SCRIPT_DIR}/node_modules"
if [ ! -d "$AGENT_MODULES" ]; then
    echo "Installation des dépendances Node.js..."
    cd "$SCRIPT_DIR"
    cp package-agent.json package.json
    npm install --production
fi

# Lancer l'agent
echo "Démarrage de l'agent système..."
exec node "${SCRIPT_DIR}/system-agent.js" 2>&1 | tee -a "$LOG_FILE"
