#!/bin/bash
# EduVision System Agent — Configuration auto-démarrage (systemd)
# À exécuter UNE FOIS sur chaque Raspberry Pi client.

set -e

echo "=== Configuration auto-démarrage EduVision System Agent ==="

# ── Charger la configuration ────────────────────────────────────────────────
CONFIG_FILE="${HOME}/EduVision-client/config/client.conf"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "ATTENTION: Configuration non trouvée, utilisation des valeurs par défaut."
    SERVER_IP="${SERVER_IP:-192.168.1.100}"
    SERVER_PORT="${SERVER_PORT:-3000}"
    SCREEN_ID="${SCREEN_ID:-screen1}"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_SCRIPT="${SCRIPT_DIR}/start-agent.sh"

if [ ! -f "$AGENT_SCRIPT" ]; then
    echo "ERREUR: start-agent.sh introuvable: $AGENT_SCRIPT"
    exit 1
fi

chmod +x "$AGENT_SCRIPT"

# ── Créer le service systemd ─────────────────────────────────────────────────
SERVICE_FILE="/etc/systemd/system/eduvision-agent.service"

echo "Création du service systemd: $SERVICE_FILE"
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=EduVision System Agent
After=network-online.target eduvision-client.service
Wants=network-online.target
# L'agent démarre après le client display (optionnel)

[Service]
Type=simple
User=${USER}
Environment=DISPLAY=:0
Environment=SERVER_IP=${SERVER_IP}
Environment=SERVER_PORT=${SERVER_PORT}
Environment=SCREEN_ID=${SCREEN_ID}
Environment=SERVER_URL=http://${SERVER_IP}:${SERVER_PORT}
WorkingDirectory=${SCRIPT_DIR}
ExecStart=${AGENT_SCRIPT}
Restart=always
RestartSec=10
# Redémarrage automatique même après shutdown/reboot volontaire
# (le Pi se reconnecte dès qu'il redémarre)

[Install]
WantedBy=multi-user.target
EOF

echo "Rechargement systemd..."
sudo systemctl daemon-reload

echo "Activation du service..."
sudo systemctl enable eduvision-agent.service

echo ""
echo "=== Configuration terminée ==="
echo ""
echo "Commandes utiles:"
echo "  sudo systemctl start   eduvision-agent   # Démarrer maintenant"
echo "  sudo systemctl stop    eduvision-agent   # Arrêter"
echo "  sudo systemctl restart eduvision-agent   # Redémarrer"
echo "  sudo systemctl status  eduvision-agent   # Voir le statut"
echo "  journalctl -u eduvision-agent -f         # Voir les logs en direct"
echo ""
echo "L'agent démarrera automatiquement au prochain boot."
echo "Lancez maintenant: sudo systemctl start eduvision-agent"
