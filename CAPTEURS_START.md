# 🎯 CAPTEURS EDUVISION - POINT DE DÉPART

> Vous avez été un développeur expert! Voici comment utiliser le module capteurs que vous venez de créer.

---

## 🚀 En 3 secondes

```bash
npm start
# Ouvrez: http://localhost:3000/sensors-dashboard.html
```

C'est tout! Vous avez un dashboard temps réel avec vos capteurs.

---

## 📊 Qu'est-ce qui a été créé?

Un système complet de lecture et affichage de capteurs (Raspberry Pi + Grove):

```
✅ Module capteurs         /services/sensors.js
✅ API REST                /api/sensors
✅ WebSocket              Socket.IO (temps réel)
✅ Dashboard              /public/sensors-dashboard.html
✅ Documentation          SENSORS_DOCUMENTATION.md
✅ Exemples               SENSORS_EXAMPLES.js
✅ Tests                  test-sensors.js
```

**Zéro code existant cassé** - Tout est isolé et modulaire.

---

## 📚 Ressources principales

### 🎯 Je veux...

| Objectif | Fichier/URL |
|----------|----------|
| **Voir les capteurs en direct** | [Dashboard](http://localhost:3000/sensors-dashboard.html) |
| **Comprendre rapidement** | [Guide de démarrage](http://localhost:3000/sensors-quickstart.html) |
| **Configuration matérielle** | [SENSORS_DOCUMENTATION.md](SENSORS_DOCUMENTATION.md) |
| **Intégrer dans mon code** | [SENSORS_EXAMPLES.js](SENSORS_EXAMPLES.js) |
| **Tester les capteurs** | `npm start` puis vérifier les logs |

---

## 🔌 Les 4 capteurs

| 📊 Capteur | 🔧 Type | 📦 Données |
|-----------|--------|-----------|
| 🌡️ Température | BME280 (I2C) | Float (°C) |
| 💧 Humidité | BME280 (I2C) | Float (%) |
| 💨 Qualité air | ADS1115 ADC (I2C) | Integer (ppm) |
| 🚀 Mouvement | PIR GPIO17 | 0 ou 1 |

---

## 🎮 3 façons d'utiliser

### 1️⃣ Dashboard (plus facile)
```bash
npm start
# Ouvrez: http://localhost:3000/sensors-dashboard.html
```

### 2️⃣ API REST (pour les requêtes)
```bash
curl http://localhost:3000/api/sensors
```

### 3️⃣ WebSocket (temps réel)
```javascript
const socket = io('http://localhost:3000');
socket.on('sensor_data', (data) => {
    console.log(data);
});
```

---

## 📁 Structure des fichiers

```
/services/
  └─ sensors.js              # Module principal
/public/
  ├─ sensors-dashboard.html  # Dashboard (belle interface)
  └─ sensors-quickstart.html # Guide interactif
Documentation/
  ├─ SENSORS_DOCUMENTATION.md   # Docs techniques
  ├─ SENSORS_EXAMPLES.js        # 10+ exemples
  ├─ README-SENSORS.md          # README
  ├─ IMPLEMENTATION_SUMMARY.md  # Synthèse
  └─ CAPTEURS_START.md          # Ce fichier
Tests/
  └─ test-sensors.js         # Tests automatisés
```

---

## 🧪 Tester maintenant

```bash
# Exécuter les tests
node test-sensors.js

# Résultat attendu: ✅ 5/5 tests passés
```

---

## 📖 Documentation par niveau

### 🟢 Débutant
1. Lire ce fichier (2 min)
2. Ouvrir le dashboard (1 min)
3. Cliquer "Activer flux temps réel" (1 min)

### 🟡 Intermédiaire
1. Lire [Guide interactif](http://localhost:3000/sensors-quickstart.html)
2. Essayer les exemples dans `SENSORS_EXAMPLES.js`
3. Intégrer dans votre app

### 🔴 Expert
1. Lire `SENSORS_DOCUMENTATION.md`
2. Étudier `/services/sensors.js`
3. Configurer le matériel (GPIO, I2C)
4. Créer des extensions

---

## 💡 Cas d'usage rapides

### Afficher la température
```javascript
fetch('/api/sensors').then(r => r.json()).then(d => {
    console.log(d.data.temperature + '°C');
});
```

### Recevoir les mises à jour temps réel
```javascript
const socket = io();
socket.on('sensor_data', (data) => {
    console.log(`${data.temperature}°C, ${data.humidity}%`);
});
```

### React Hook
```javascript
// Voir SENSORS_EXAMPLES.js pour l'implémentation complète
const { sensors } = useSensors();
return <span>{sensors.temperature}°C</span>;
```

---

## ⚙️ Configuration (optionnel)

### Modifier le port
Éditer `server.js` ligne 20:
```javascript
const PORT = 3001; // Défaut: 3000
```

### Modifier le pin GPIO
Éditer `/services/sensors.js` ligne 52:
```javascript
motionSensor = new Gpio(27, 'in', 'both'); // Défaut: 17
```

### Modifier l'adresse I2C
Éditer `/services/sensors.js` ligne 31:
```javascript
address: 0x77 // Défaut: 0x48
```

---

## 🟢 État du système

```
✅ Module capteurs         Prêt
✅ API REST                Prêt
✅ WebSocket              Prêt
✅ Dashboard              Prêt
✅ Documentation          Complète
✅ Tests                  100% passés
✅ Code existant          Intact
└─ 🚀 PRÊT À L'EMPLOI
```

---

## 🎯 Prochaines étapes

1. **Découvrir le dashboard**
   ```bash
   npm start
   # Ouvrez: http://localhost:3000/sensors-dashboard.html
   ```

2. **Brancher vos capteurs** (si vous en avez)
   - BME280 sur I2C (0x76)
   - ADS1115 sur I2C (0x48)
   - PIR sur GPIO 17

3. **Vérifier la détection**
   ```bash
   i2cdetect -y 1
   ```

4. **Consulter la documentation**
   - [SENSORS_DOCUMENTATION.md](SENSORS_DOCUMENTATION.md) - Docs techniques
   - [SENSORS_EXAMPLES.js](SENSORS_EXAMPLES.js) - Exemples de code

5. **Intégrer dans votre app**
   ```javascript
   // Util API, Socket.IO, ou module Node.js
   const response = await fetch('/api/sensors');
   ```

---

## 🚨 Troubleshooting rapide

| Problème | Solution |
|----------|----------|
| Données = `--` | Normal! Les capteurs ne sont pas branchés. Le fallback s'active automatiquement. |
| Port 3000 occupé | `lsof -i :3000 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| Socket.IO ne marche pas | Vérifier les logs et la connexion |
| API ne répond pas | Tester avec `curl http://localhost:3000/api/sensors` |

Plus de solutions → [SENSORS_DOCUMENTATION.md](SENSORS_DOCUMENTATION.md)

---

## 📞 Vous avez besoin d'aide?

1. **Rapide** → Lire ce fichier
2. **Démarrage** → [Guide interactif](http://localhost:3000/sensors-quickstart.html)
3. **Technique** → [SENSORS_DOCUMENTATION.md](SENSORS_DOCUMENTATION.md)
4. **Code** → [SENSORS_EXAMPLES.js](SENSORS_EXAMPLES.js)
5. **Tests** → `node test-sensors.js`
6. **Logs** → `tail -f logs/$(date +%Y-%m-%d).log`

---

## ✨ Points à retenir

- ✅ **Isolé** - Code dans `/services/sensors.js`
- ✅ **Robuste** - Fallback automatique
- ✅ **Sans casse** - Code existant intact
- ✅ **Documenté** - Guides + exemples
- ✅ **Testé** - Tests automatisés (100% passés)
- ✅ **Prêt** - Déployer maintenant

---

## 🎊 C'est parti!

```bash
npm start
```

Puis ouvrez: **http://localhost:3000/sensors-dashboard.html**

**Bon développement! 🚀**

---

## 📝 Fichiers clés

| Fichier | Importance | Lire si... |
|---------|-----------|-----------|
| `IMPLEMENTATION_SUMMARY.md` | 10/10 | Vous voulez l'aperçu complet |
| `SENSORS_DOCUMENTATION.md` | 8/10 | Vous devez configurer le matériel |
| `SENSORS_EXAMPLES.js` | 7/10 | Vous intégrez dans votre code |
| `/services/sensors.js` | 9/10 | Vous modifiez le module |
| `server.js` | 6/10 | Vous comprenez les routes |

---

*Module Capteurs EduVision - Créé 27 mars 2026*
*Zéro breaking change | Code isolé et modulaire | Prêt à l'emploi*
