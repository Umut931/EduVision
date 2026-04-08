#!/bin/bash
# EduVision Client - Script d'installation
# Ce script installe toutes les dépendances nécessaires pour le client Raspberry Pi

set -e  # Arrêter en cas d'erreur

echo "=== Installation du client EduVision ==="

# Mettre à jour la liste des paquets
echo "Mise à jour de la liste des paquets..."
sudo apt update

# Installer Chromium
echo "Installation de Chromium..."
sudo apt install -y chromium-browser

# Installer curl si pas présent
if ! command -v curl &> /dev/null; then
    echo "Installation de curl..."
    sudo apt install -y curl
fi

# Installer xdotool pour contrôler la fenêtre (optionnel)
echo "Installation de xdotool (pour contrôle avancé)..."
sudo apt install -y xdotool

# Installer unclutter pour cacher le curseur (optionnel)
echo "Installation de unclutter (masquer le curseur)..."
sudo apt install -y unclutter

# Créer les dossiers nécessaires
echo "Création des dossiers..."
mkdir -p ~/EduVision-client/logs
mkdir -p ~/EduVision-client/config

# Rendre les scripts exécutables
echo "Configuration des permissions..."
chmod +x start-client.sh
chmod +x setup-autostart.sh
chmod +x update-client.sh

# Créer le fichier de configuration par défaut
if [ ! -f ~/EduVision-client/config/client.conf ]; then
    echo "Création du fichier de configuration..."
    cat > ~/EduVision-client/config/client.conf << EOF
# Configuration du client EduVision
# Modifiez ces valeurs selon votre installation

# Adresse IP du serveur EduVision
SERVER_IP=192.168.1.100

# Port du serveur (défaut: 3000)
SERVER_PORT=3000

# ID unique de cet écran (screen1, screen2, etc.)
SCREEN_ID=screen1

# Options supplémentaires pour Chromium
CHROMIUM_EXTRA_OPTS="--disable-web-security --user-agent='EduVision-Client/1.0'"
EOF
fi

echo "=== Installation terminée ==="
echo ""
echo "Prochaines étapes:"
echo "1. Modifiez le fichier ~/EduVision-client/config/client.conf"
echo "2. Lancez setup-autostart.sh pour configurer le démarrage automatique"
echo "3. Redémarrez pour tester"
echo ""
echo "Pour démarrer manuellement: ./start-client.sh"