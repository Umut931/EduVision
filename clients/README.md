# EduVision — Client Raspberry Pi

Chaque client EduVision est constitué de **deux processus** qui tournent en parallèle sur la Raspberry Pi :

| Processus | Script | Rôle |
|---|---|---|
| **Display** | `start-client.sh` | Lance Chromium en mode kiosk, affiche le contenu du serveur |
| **System Agent** | `system-agent.js` | Processus Node.js connecté au serveur via Socket.IO, reçoit et exécute les commandes système (shutdown, reboot, screen-off, screen-on) |

Chaque processus a son propre service systemd et peut redémarrer indépendamment.

---

## Prérequis

- Raspberry Pi avec **Raspberry Pi OS** (Bullseye ou Bookworm, Desktop ou Lite + X11)
- Accès réseau au serveur EduVision
- Compte utilisateur `pi` (ou adaptez les scripts)
- Node.js >= 16 (`sudo apt install -y nodejs npm`)

---

## Installation

### 1. Copier les fichiers sur la Raspberry Pi

Depuis le serveur ou votre poste :

```bash
scp -r clients/ pi@<IP_DU_PI>:~/EduVision-client/
ssh pi@<IP_DU_PI>
cd ~/EduVision-client
```

### 2. Rendre les scripts exécutables

```bash
./make-executable.sh
```

### 3. Installer les dépendances système

```bash
./install.sh
```

Installe : `chromium-browser`, `curl`, `xdotool`, `unclutter` et crée les dossiers `config/` et `logs/`.

### 4. Configurer le client

```bash
cp client.conf.example config/client.conf
nano config/client.conf
```

Paramètres à modifier :

```ini
# Adresse IP du serveur EduVision
SERVER_IP=192.168.1.100

# Port du serveur (défaut : 3000)
SERVER_PORT=3000

# Identifiant unique de cet écran (différent sur chaque Pi)
SCREEN_ID=screen1
```

> Pour plusieurs écrans, utilisez `screen1`, `screen2`, `screen3`, etc. Chaque Pi doit avoir un `SCREEN_ID` différent.

### 5. Autoriser shutdown/reboot sans mot de passe

L'agent système a besoin de `sudo` pour éteindre ou redémarrer la machine. Ce script crée une règle sudoers minimale (uniquement `shutdown` et `reboot`) :

```bash
./setup-sudoers.sh
```

Pour révoquer ces permissions plus tard :
```bash
sudo rm /etc/sudoers.d/eduvision-agent
```

### 6. Installer les dépendances Node.js de l'agent

```bash
cd ~/EduVision-client
cp package-agent.json package.json
npm install --production
```

---

## Configuration de l'auto-démarrage

Deux services systemd distincts sont nécessaires.

### Service display (Chromium kiosk)

```bash
./setup-autostart.sh
```

Crée et active `/etc/systemd/system/eduvision-client.service`.

### Service agent système (Node.js)

```bash
./setup-agent-autostart.sh
```

Crée et active `/etc/systemd/system/eduvision-agent.service`.

### Démarrer les services sans redémarrer

```bash
sudo systemctl start eduvision-client
sudo systemctl start eduvision-agent
```

### Vérifier que tout fonctionne

```bash
sudo systemctl status eduvision-client
sudo systemctl status eduvision-agent
```

---

## Structure des fichiers

```
~/EduVision-client/
├── system-agent.js          # Agent système Node.js
├── start-client.sh          # Démarre Chromium en kiosk
├── start-agent.sh           # Démarre l'agent Node.js
├── install.sh               # Installe les dépendances système
├── setup-autostart.sh       # Configure le service systemd du display
├── setup-agent-autostart.sh # Configure le service systemd de l'agent
├── setup-sudoers.sh         # Configure sudo sans mot de passe
├── update-client.sh         # Met à jour les fichiers du client
├── diagnose.sh              # Diagnostic complet
├── make-executable.sh       # Rend tous les scripts exécutables
├── client.conf.example      # Modèle de configuration
├── package-agent.json       # Dépendances Node.js (socket.io-client)
├── config/
│   └── client.conf          # Configuration active (créée à l'installation)
└── logs/
    └── system-agent.log     # Logs de l'agent
```

---

## Commandes systemd utiles

```bash
# Statut
sudo systemctl status eduvision-client
sudo systemctl status eduvision-agent

# Démarrer / Arrêter / Redémarrer
sudo systemctl start   eduvision-client
sudo systemctl stop    eduvision-client
sudo systemctl restart eduvision-client

sudo systemctl start   eduvision-agent
sudo systemctl stop    eduvision-agent
sudo systemctl restart eduvision-agent

# Logs en direct
journalctl -u eduvision-client -f
journalctl -u eduvision-agent  -f
```

---

## Dépannage

### Lancer le diagnostic complet

```bash
./diagnose.sh
```

Vérifie la configuration, la connectivité réseau, les dépendances, l'état des services et affiche les logs récents.

### Le display ne s'ouvre pas

1. Vérifier que `chromium-browser` est installé : `which chromium-browser`
2. Vérifier la variable `DISPLAY` : doit être `:0`
3. Voir les logs : `journalctl -u eduvision-client -f`

### L'agent ne se connecte pas au serveur

1. Vérifier que `SERVER_IP` et `SERVER_PORT` dans `config/client.conf` sont corrects
2. Tester la connectivité : `curl http://<SERVER_IP>:3000`
3. Voir les logs : `journalctl -u eduvision-agent -f` ou `cat logs/system-agent.log`

### shutdown/reboot refusé par l'agent

Le fichier sudoers n'est pas configuré. Relancer :
```bash
./setup-sudoers.sh
```

### screen-off / screen-on ne fonctionne pas

L'agent essaie automatiquement plusieurs méthodes dans l'ordre :
- `vcgencmd display_power` (RPi 4 et antérieur, firmware VideoCore)
- `xset dpms force off/on` (X11, Bullseye et antérieur)
- `wlr-randr` (Wayland, RPi 5)

Si aucune ne fonctionne, vérifier que la variable `DISPLAY=:0` est bien exportée et que l'environnement graphique est actif.

---

## Mise à jour

```bash
cd ~/EduVision-client
./update-client.sh
sudo systemctl restart eduvision-client
sudo systemctl restart eduvision-agent
```

---

## Sécurité

- L'agent n'accepte que 4 commandes (`shutdown`, `reboot`, `screen-off`, `screen-on`) via une liste blanche stricte.
- Les commandes sont exécutées avec `spawn` sans shell, ce qui empêche toute injection.
- Les permissions `sudo` sont limitées aux seuls binaires `shutdown` et `reboot`.
- Les communications client/serveur se font en HTTP — en production, configurez un proxy HTTPS sur le serveur.
