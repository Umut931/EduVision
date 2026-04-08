# EduVision Client - Documentation complète

## Vue d'ensemble

Le dossier `clients/` contient tous les scripts et fichiers nécessaires pour déployer et gérer des clients EduVision sur des Raspberry Pi. Ces clients affichent automatiquement le contenu du serveur EduVision en mode kiosk (plein écran).

## Architecture

```
clients/
├── start-client.sh          # Script de démarrage principal
├── install.sh               # Installation des dépendances
├── setup-autostart.sh       # Configuration auto-démarrage
├── update-client.sh         # Mise à jour automatique
├── diagnose.sh              # Diagnostic et dépannage
├── make-executable.sh       # Rend les scripts exécutables
├── client.conf.example      # Exemple de configuration
└── README.md               # Cette documentation
```

## Installation et configuration

### 1. Préparation de la Raspberry Pi

Chaque Raspberry Pi doit être configurée avec :
- Raspberry Pi OS (Lite ou Desktop)
- Accès réseau stable
- Compte utilisateur `pi` (ou modifiez les scripts)

### 2. Installation

```bash
# Copier les fichiers clients sur la Raspberry Pi
scp -r clients/ pi@RASPBERRY_IP:~/EduVision-client/

# Se connecter à la Raspberry Pi
ssh pi@RASPBERRY_IP

# Aller dans le dossier et rendre exécutables
cd ~/EduVision-client
./make-executable.sh

# Puis installer
./install.sh
```

### 3. Configuration

```bash
# Copier le fichier de configuration exemple
cp client.conf.example config/client.conf

# Éditer la configuration
nano config/client.conf
```

**Paramètres importants :**
- `SERVER_IP`: Adresse IP du serveur EduVision
- `SCREEN_ID`: ID unique de l'écran (screen1, screen2, etc.)
- `SERVER_PORT`: Port du serveur (défaut: 3000)

### 4. Configuration de l'auto-démarrage

```bash
# Configurer le démarrage automatique
./setup-autostart.sh

# Redémarrer pour tester
sudo reboot
```

## Scripts détaillés

### start-client.sh
**Rôle**: Démarre Chromium en mode kiosk pointant vers le serveur.

**Fonctionnalités**:
- Vérification de l'installation de Chromium
- Test de connectivité réseau
- Démarrage en mode kiosk avec options optimisées
- Gestion des variables d'environnement

**Utilisation manuelle**:
```bash
./start-client.sh
```

### install.sh
**Rôle**: Installe toutes les dépendances nécessaires.

**Ce qu'il fait**:
- Mise à jour des paquets système
- Installation de Chromium
- Installation d'outils supplémentaires (curl, xdotool, unclutter)
- Création des dossiers nécessaires
- Configuration des permissions
- Création du fichier de configuration par défaut

### setup-autostart.sh
**Rôle**: Configure le démarrage automatique via systemd.

**Ce qu'il fait**:
- Création d'un service systemd
- Configuration des variables d'environnement
- Activation du service
- Gestion des redémarrages automatiques

**Service créé**: `/etc/systemd/system/eduvision-client.service`

### update-client.sh
**Rôle**: Met à jour le client depuis le dépôt.

**Ce qu'il fait**:
- Sauvegarde de la configuration actuelle
- Mise à jour des fichiers depuis le dépôt
- Restauration de la configuration
- Reconfiguration des permissions

### diagnose.sh
**Rôle**: Diagnostique l'état du client et aide au dépannage.

**Vérifications effectuées**:
- Configuration chargée
- Connectivité réseau
- Dépendances installées
- État du service systemd
- Logs récents
- Espace disque disponible
- Recommandations de correction

## Configuration avancée

### Variables d'environnement

Le script `start-client.sh` utilise ces variables d'environnement :

- `SERVER_IP`: IP du serveur (défaut: 192.168.1.100)
- `SERVER_PORT`: Port du serveur (défaut: 3000)
- `SCREEN_ID`: ID de l'écran (défaut: screen1)
- `CHROMIUM_OPTS`: Options supplémentaires pour Chromium

### Options Chromium

Options utilisées par défaut :
- `--kiosk`: Mode plein écran
- `--disable-restore-session-state`: Pas de restauration de session
- `--disable-background-timer-throttling`: Timers toujours actifs
- `--disable-renderer-backgrounding`: Rendu toujours actif
- `--disable-features=TranslateUI`: Désactive la traduction
- `--no-first-run`: Pas de premier lancement
- `--disable-default-apps`: Pas d'apps par défaut
- `--disable-infobars`: Pas de barres d'info
- `--disable-session-crashed-bubble`: Pas de bulle crash
- `--disable-component-extensions-with-background-pages`: Pas d'extensions background

## Dépannage

### Le client ne démarre pas

1. Vérifier les logs systemd :
```bash
sudo journalctl -u eduvision-client.service -f
```

2. Lancer le diagnostic :
```bash
./diagnose.sh
```

3. Vérifier la configuration :
```bash
cat ~/EduVision-client/config/client.conf
```

### Problèmes réseau

1. Vérifier la connectivité :
```bash
ping VOTRE_SERVEUR_IP
curl http://VOTRE_SERVEUR_IP:3000
```

2. Vérifier le firewall sur le serveur

### Problèmes d'affichage

1. Redémarrer le service :
```bash
sudo systemctl restart eduvision-client.service
```

2. Vérifier que l'écran est connecté et configuré

## Structure des dossiers

Après installation, la structure suivante est créée :

```
~/EduVision-client/
├── start-client.sh          # Script de démarrage
├── setup-autostart.sh       # Configuration auto-démarrage
├── update-client.sh         # Mise à jour
├── diagnose.sh              # Diagnostic
├── config/
│   └── client.conf          # Configuration
└── logs/                    # Logs du client
```

## Commandes systemd utiles

```bash
# Statut du service
sudo systemctl status eduvision-client.service

# Démarrer le service
sudo systemctl start eduvision-client.service

# Arrêter le service
sudo systemctl stop eduvision-client.service

# Redémarrer le service
sudo systemctl restart eduvision-client.service

# Activer au démarrage
sudo systemctl enable eduvision-client.service

# Désactiver au démarrage
sudo systemctl disable eduvision-client.service

# Voir les logs
sudo journalctl -u eduvision-client.service -f
```

## Mise à jour

Pour mettre à jour le client :

```bash
cd ~/EduVision-client
./update-client.sh
sudo systemctl restart eduvision-client.service
```

## Sécurité

- Le client fonctionne en mode kiosk, empêchant l'accès au système
- Les communications se font via HTTP (considérez HTTPS en production)
- Aucun stockage de données sensibles côté client
- Le client est en lecture seule par rapport au serveur

## Support

En cas de problème :
1. Consultez les logs avec `diagnose.sh`
2. Vérifiez la configuration réseau
3. Redémarrez le service
4. Vérifiez que le serveur EduVision fonctionne

---

**Version**: 1.0
**Dernière mise à jour**: Avril 2026
**Auteur**: EduVision Team