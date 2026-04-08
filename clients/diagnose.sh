#!/bin/bash
# EduVision Client - Script de diagnostic
# Ce script vérifie l'état du client et aide au dépannage

echo "=== Diagnostic du client EduVision ==="
echo "Date: $(date)"
echo "Utilisateur: $(whoami)"
echo "Système: $(uname -a)"
echo ""

# Vérifier la configuration
echo "=== Configuration ==="
CONFIG_FILE="${HOME}/EduVision-client/config/client.conf"
if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Fichier de configuration trouvé: $CONFIG_FILE"
    echo "Contenu:"
    cat "$CONFIG_FILE" | sed 's/^/  /'
else
    echo "✗ Fichier de configuration manquant: $CONFIG_FILE"
fi
echo ""

# Charger la configuration si elle existe
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Valeurs par défaut
SERVER_IP="${SERVER_IP:-192.168.1.100}"
SERVER_PORT="${SERVER_PORT:-3000}"
SCREEN_ID="${SCREEN_ID:-screen1}"

echo "=== Réseau ==="
echo "Adresse IP locale: $(hostname -I | awk '{print $1}')"
echo "Passerelle: $(ip route | grep default | awk '{print $3}')"
echo "Serveur cible: ${SERVER_IP}:${SERVER_PORT}"
echo ""

# Tester la connectivité
echo "Test de connectivité réseau:"
if ping -c 1 -W 2 "$SERVER_IP" &> /dev/null; then
    echo "✓ Ping vers le serveur: OK"
else
    echo "✗ Ping vers le serveur: ÉCHEC"
fi

CLIENT_URL="http://${SERVER_IP}:${SERVER_PORT}/client/${SCREEN_ID}"
echo "URL du client: $CLIENT_URL"

if curl -s --max-time 5 --head "$CLIENT_URL" &> /dev/null; then
    echo "✓ Connexion HTTP vers le serveur: OK"
else
    echo "✗ Connexion HTTP vers le serveur: ÉCHEC"
fi
echo ""

# Vérifier les dépendances
echo "=== Dépendances ==="
deps=("chromium-browser" "curl" "systemctl")
for dep in "${deps[@]}"; do
    if command -v "$dep" &> /dev/null; then
        echo "✓ $dep: installé"
    else
        echo "✗ $dep: manquant"
    fi
done
echo ""

# Vérifier le service systemd
echo "=== Service Systemd ==="
SERVICE_NAME="eduvision-client.service"
if sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "✓ Service actif: $SERVICE_NAME"
else
    echo "✗ Service inactif: $SERVICE_NAME"
fi

if sudo systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "✓ Service activé au démarrage: $SERVICE_NAME"
else
    echo "✗ Service non activé au démarrage: $SERVICE_NAME"
fi
echo ""

# Afficher les logs récents
echo "=== Logs récents du service ==="
sudo journalctl -u "$SERVICE_NAME" -n 10 --no-pager 2>/dev/null || echo "Impossible de lire les logs systemd"
echo ""

# Vérifier l'espace disque
echo "=== Espace disque ==="
df -h "$HOME" | tail -1
echo ""

# Recommandations
echo "=== Recommandations ==="
if ! command -v chromium-browser &> /dev/null; then
    echo "• Lancez ./install.sh pour installer les dépendances"
fi

if ! sudo systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "• Lancez sudo systemctl start $SERVICE_NAME pour démarrer le service"
fi

if ! sudo systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "• Lancez ./setup-autostart.sh pour configurer l'auto-démarrage"
fi

if ! curl -s --max-time 5 --head "$CLIENT_URL" &> /dev/null; then
    echo "• Vérifiez que le serveur EduVision fonctionne sur $SERVER_IP:$SERVER_PORT"
    echo "• Vérifiez la configuration réseau et firewall"
fi

echo ""
echo "=== Fin du diagnostic ==="