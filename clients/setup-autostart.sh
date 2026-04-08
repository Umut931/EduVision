#!/bin/bash
# EduVision Client - Configuration de l'auto-démarrage
# Ce script configure le démarrage automatique du client au boot

set -e  # Arrêter en cas d'erreur

echo "=== Configuration de l'auto-démarrage ==="

# Charger la configuration
CONFIG_FILE="${HOME}/EduVision-client/config/client.conf"
if [ -f "$CONFIG_FILE" ]; then
    echo "Chargement de la configuration depuis $CONFIG_FILE"
    source "$CONFIG_FILE"
else
    echo "ATTENTION: Fichier de configuration non trouvé: $CONFIG_FILE"
    echo "Utilisation des valeurs par défaut..."
    SERVER_IP="${SERVER_IP:-192.168.1.100}"
    SERVER_PORT="${SERVER_PORT:-3000}"
    SCREEN_ID="${SCREEN_ID:-screen1}"
fi

# Chemin absolu vers le script de démarrage
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_SCRIPT="${SCRIPT_DIR}/start-client.sh"

# Créer le service systemd
SERVICE_FILE="/etc/systemd/system/eduvision-client.service"

echo "Création du service systemd..."
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=EduVision Client Display
After=network.target graphical.target
Wants=graphical.target

[Service]
Type=simple
User=${USER}
Environment=DISPLAY=:0
Environment=SERVER_IP=${SERVER_IP}
Environment=SERVER_PORT=${SERVER_PORT}
Environment=SCREEN_ID=${SCREEN_ID}
ExecStart=${START_SCRIPT}
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

# Recharger systemd
echo "Rechargement de systemd..."
sudo systemctl daemon-reload

# Activer et démarrer le service
echo "Activation du service..."
sudo systemctl enable eduvision-client.service

echo "=== Configuration terminée ==="
echo ""
echo "Le client EduVision démarrera automatiquement au prochain redémarrage."
echo ""
echo "Commandes utiles:"
echo "  sudo systemctl start eduvision-client.service    # Démarrer maintenant"
echo "  sudo systemctl stop eduvision-client.service     # Arrêter"
echo "  sudo systemctl restart eduvision-client.service  # Redémarrer"
echo "  sudo systemctl status eduvision-client.service   # Voir le statut"
echo "  journalctl -u eduvision-client.service -f        # Voir les logs"
echo ""
echo "Pour désactiver l'auto-démarrage:"
echo "  sudo systemctl disable eduvision-client.service"