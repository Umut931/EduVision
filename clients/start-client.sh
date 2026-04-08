#!/bin/bash
# EduVision Client - Script de démarrage
# Ce script démarre le client EduVision en mode kiosk

# Configuration
SERVER_IP="${SERVER_IP:-192.168.1.100}"
SERVER_PORT="${SERVER_PORT:-3000}"
SCREEN_ID="${SCREEN_ID:-screen1}"
CHROMIUM_OPTS="--kiosk --disable-restore-session-state --disable-background-timer-throttling --disable-renderer-backgrounding --disable-features=TranslateUI --no-first-run --disable-default-apps --disable-infobars --disable-session-crashed-bubble --disable-component-extensions-with-background-pages"

# URL du serveur
CLIENT_URL="http://${SERVER_IP}:${SERVER_PORT}/client/${SCREEN_ID}"

echo "=== EduVision Client Démarrage ==="
echo "Serveur: ${SERVER_IP}:${SERVER_PORT}"
echo "Écran ID: ${SCREEN_ID}"
echo "URL: ${CLIENT_URL}"
echo "Options Chromium: ${CHROMIUM_OPTS}"
echo "=================================="

# Vérifier que Chromium est installé
if ! command -v chromium-browser &> /dev/null; then
    echo "ERREUR: Chromium n'est pas installé. Lancez d'abord install.sh"
    exit 1
fi

# Vérifier la connectivité réseau
echo "Test de connectivité vers le serveur..."
if ! curl -s --max-time 5 "${CLIENT_URL}" > /dev/null; then
    echo "ATTENTION: Impossible de contacter le serveur ${CLIENT_URL}"
    echo "Le client va quand même démarrer..."
fi

# Démarrer Chromium en mode kiosk
echo "Démarrage de Chromium..."
exec chromium-browser ${CHROMIUM_OPTS} "${CLIENT_URL}"