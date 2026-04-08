#!/bin/bash
# EduVision Client - Script de mise à jour
# Ce script met à jour le client depuis le dépôt Git

set -e  # Arrêter en cas d'erreur

echo "=== Mise à jour du client EduVision ==="

# Vérifier si git est installé
if ! command -v git &> /dev/null; then
    echo "Installation de git..."
    sudo apt update && sudo apt install -y git
fi

# Sauvegarder la configuration actuelle
CONFIG_BACKUP="${HOME}/EduVision-client/config/client.conf.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f "${HOME}/EduVision-client/config/client.conf" ]; then
    echo "Sauvegarde de la configuration..."
    cp "${HOME}/EduVision-client/config/client.conf" "$CONFIG_BACKUP"
    echo "Configuration sauvegardée dans: $CONFIG_BACKUP"
fi

# Cloner ou mettre à jour le dépôt
REPO_DIR="${HOME}/EduVision-client"
CLIENTS_DIR="${REPO_DIR}/clients"

if [ -d "$REPO_DIR/.git" ]; then
    echo "Mise à jour du dépôt existant..."
    cd "$REPO_DIR"
    git pull origin main
else
    echo "Clonage du dépôt..."
    # Pour cet exemple, on suppose que c'est un dépôt local
    # En production, remplacez par l'URL du dépôt
    if [ -d "/home/pi/Desktop/EduVision-main" ]; then
        echo "Copie depuis le dépôt local..."
        cp -r "/home/pi/Desktop/EduVision-main/clients" "$REPO_DIR/"
    else
        echo "ERREUR: Dépôt source non trouvé"
        exit 1
    fi
fi

# Restaurer la configuration
if [ -f "$CONFIG_BACKUP" ]; then
    echo "Restauration de la configuration..."
    cp "$CONFIG_BACKUP" "${HOME}/EduVision-client/config/client.conf"
fi

# Rendre les scripts exécutables
echo "Configuration des permissions..."
chmod +x "${CLIENTS_DIR}/start-client.sh"
chmod +x "${CLIENTS_DIR}/install.sh"
chmod +x "${CLIENTS_DIR}/setup-autostart.sh"
chmod +x "${CLIENTS_DIR}/update-client.sh"

# Copier les scripts dans le répertoire de travail
echo "Mise à jour des scripts..."
cp "${CLIENTS_DIR}/start-client.sh" "${HOME}/EduVision-client/"
cp "${CLIENTS_DIR}/setup-autostart.sh" "${HOME}/EduVision-client/"
cp "${CLIENTS_DIR}/update-client.sh" "${HOME}/EduVision-client/"

echo "=== Mise à jour terminée ==="
echo ""
echo "Redémarrez le service pour appliquer les changements:"
echo "  sudo systemctl restart eduvision-client.service"
echo ""
echo "Ou redémarrez le système."