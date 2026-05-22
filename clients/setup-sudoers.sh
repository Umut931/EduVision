#!/bin/bash
# EduVision System Agent — Configuration des permissions sudo
# Permet à l'agent d'exécuter shutdown et reboot SANS mot de passe.
# À exécuter UNE FOIS sur chaque Raspberry Pi client.
#
# SÉCURITÉ: seules ces deux commandes exactes sont autorisées sans mot de passe.
# L'agent ne peut pas exécuter de commandes arbitraires.

set -e

CURRENT_USER="${USER:-pi}"
SUDOERS_FILE="/etc/sudoers.d/eduvision-agent"

echo "=== Configuration sudo pour EduVision System Agent ==="
echo "Utilisateur: ${CURRENT_USER}"
echo "Fichier sudoers: ${SUDOERS_FILE}"
echo ""

# Détecter les chemins exacts de shutdown et reboot
SHUTDOWN_PATH="$(command -v shutdown 2>/dev/null || echo '/sbin/shutdown')"
REBOOT_PATH="$(command -v reboot 2>/dev/null || echo '/sbin/reboot')"

echo "Chemin shutdown : ${SHUTDOWN_PATH}"
echo "Chemin reboot   : ${REBOOT_PATH}"
echo ""

# Créer la règle sudoers (fichier séparé pour faciliter la suppression)
sudo tee "$SUDOERS_FILE" > /dev/null << EOF
# EduVision System Agent — permissions de contrôle système
# Généré automatiquement par setup-sudoers.sh
# Supprimez ce fichier pour révoquer les permissions.

# Arrêt et redémarrage sans mot de passe
${CURRENT_USER} ALL=(ALL) NOPASSWD: ${SHUTDOWN_PATH} -h now
${CURRENT_USER} ALL=(ALL) NOPASSWD: ${SHUTDOWN_PATH}
${CURRENT_USER} ALL=(ALL) NOPASSWD: ${REBOOT_PATH}
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/shutdown -h now
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/shutdown
${CURRENT_USER} ALL=(ALL) NOPASSWD: /sbin/reboot
EOF

# Fixer les permissions correctes (sudoers doit être 0440)
sudo chmod 0440 "$SUDOERS_FILE"

# Valider la syntaxe avec visudo
if sudo visudo -c -f "$SUDOERS_FILE" 2>/dev/null; then
    echo "✅ Règles sudoers valides et appliquées."
else
    echo "❌ ERREUR: Syntaxe sudoers invalide. Suppression du fichier."
    sudo rm -f "$SUDOERS_FILE"
    exit 1
fi

echo ""
echo "=== Configuration terminée ==="
echo ""
echo "L'agent peut maintenant exécuter 'sudo shutdown -h now' et 'sudo reboot'"
echo "sans demande de mot de passe."
echo ""
echo "Pour révoquer ces permissions:"
echo "  sudo rm ${SUDOERS_FILE}"
