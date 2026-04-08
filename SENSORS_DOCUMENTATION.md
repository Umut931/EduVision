# 📚 Documentation - Module Capteurs EduVision

## 🎯 Vue d'ensemble

Le module capteurs permet de lire et afficher les données de capteurs physiques connectés à la Raspberry Pi via I2C et GPIO, avec un fallback automatique sur des valeurs simulées si les capteurs ne sont pas disponibles.

---

## 📦 Architecture

### Structure des fichiers

```
/services/sensors.js          # Module isolé de gestion des capteurs
/public/sensors-dashboard.html # Dashboard d'affichage temps réel
server.js                      # Serveur principal (modifié)
```

### Dépendances utilisées

- **i2c-bus** (v5.2.3) - Communication I2C pour les capteurs
- **ads1x15** (v1.2.0) - Lecteur ADC ADS1115 pour qualité de l'air
- **onoff** (v6.0.3) - Contrôle des GPIO pour le capteur de mouvement
- **socket.io** (v4.8.3) - Transmission temps réel des données

---

## 🔧 Configuration matérielle

### Capteur de température/humidité (I2C)

**Type recommandé:** BME280 ou DHT22 (via adaptateur I2C)

- **Bus I2C:** Bus 1 (par défaut sur Raspberry Pi)
- **Adresse:** 0x76 ou 0x77 (configurable)
- **Broche:** GPIO2 (SDA), GPIO3 (SCL)

```
BME280 GND     → Raspberry Pi GND
BME280 VIN     → Raspberry Pi 3.3V
BME280 SDA     → Raspberry Pi GPIO2
BME280 SCL     → Raspberry Pi GPIO3
```

### Capteur de qualité de l'air (ADC)

**Type recommandé:** Capteur CO2/VOC Grove avec ADS1115

- **Bus I2C:** Bus 1
- **Adresse ADC:** 0x48 (configurable en ligne 31 de sensors.js)
- **Canal ADC utilisé:** 0

```
ADS1115 GND    → Raspberry Pi GND
ADS1115 VIN    → Raspberry Pi 3.3V
ADS1115 SDA    → Raspberry Pi GPIO2
ADS1115 SCL    → Raspberry Pi GPIO3
ADS1115 A0     → Capteur CO2/VOC
```

### Capteur de mouvement (GPIO)

**Type recommandé:** Capteur PIR (Passive Infrared)

- **PIN GPIO:** GPIO17 (configurable en ligne 52 de sensors.js)
- **Type Arduino/Grove:** Analogique ou digital

```
PIR GND        → Raspberry Pi GND
PIR VIN        → Raspberry Pi 5V
PIR OUT        → Raspberry Pi GPIO17
```

---

## 🚀 Utilisation

### 1. Vérifier la configuration

Éditez `/services/sensors.js` si vous utilisez des pins différents:

```javascript
// Ligne 31 - Adresse ADS1115
address: 0x48

// Ligne 52 - PIN du capteur de mouvement
motionSensor = new Gpio(17, 'in', 'both');
```

### 2. Démarrage du serveur

```bash
npm start
# ou avec nodemon
npm run dev
```

### 3. Accéder au dashboard

Ouvrez votre navigateur à:
```
http://localhost:3000/sensors-dashboard.html
```

---

## 📡 API REST

### GET `/api/sensors`

Récupère les données actuelles des capteurs.

**Requête:**
```bash
curl http://localhost:3000/api/sensors
```

**Réponse réussie:**
```json
{
  "success": true,
  "data": {
    "temperature": 22.45,
    "humidity": 52.30,
    "air_quality": 425,
    "motion": 0,
    "timestamp": 1710000000000,
    "initialized": true,
    "error": null
  }
}
```

**Réponse erreur:**
```json
{
  "success": false,
  "message": "Erreur lors de la lecture des capteurs",
  "error": "Message d'erreur détaillé"
}
```

### POST `/api/sensors/subscribe`

Active la transmission WebSocket des données (1x/seconde).

```bash
curl -X POST http://localhost:3000/api/sensors/subscribe
```

### POST `/api/sensors/unsubscribe`

Désactive la transmission WebSocket.

```bash
curl -X POST http://localhost:3000/api/sensors/unsubscribe
```

---

## 🔌 WebSocket (Socket.IO)

### Événement: `sensor_data`

Reçu toutes les secondes lorsque des clients sont connectés.

**Client (JavaScript):**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('sensor_data', (data) => {
    console.log('Température:', data.temperature);
    console.log('Humidité:', data.humidity);
    console.log('Qualité air:', data.air_quality);
    console.log('Mouvement:', data.motion); // 0 ou 1
});
```

**Format des données:**
```json
{
  "temperature": 22.45,
  "humidity": 52.30,
  "air_quality": 425,
  "motion": 0,
  "timestamp": 1710000000000,
  "initialized": true,
  "error": null
}
```

---

## 🧪 Mode fallback

Si un capteur n'est pas disponible:

| Capteur | Valeur de fallback |
|---------|-------------------|
| Température | 20-25°C (simulée) |
| Humidité | 50-65% (simulée) |
| Qualité air | 300-500 ppm (simulée) |
| Mouvement | 0 (inactif) |

**Aucune erreur ne sera levée** - Le système continue fonctionnement.

---

## 🔍 Diagnostic

### Logs du serveur

Les logs sont sauvegardés dans `/logs/YYYY-MM-DD.log`

Exemples de logs:
```
[2026-03-27 15:30:45] [INFO] Bus I2C (1) ouvert avec succès
[2026-03-27 15:30:45] [WARNING] Impossible d'initialiser l'ADC: Device not found
[2026-03-27 15:30:45] [INFO] Capteur mouvement (GPIO 17) initialisé avec succès
[2026-03-27 15:30:46] [SUCCESS] Données capteurs récupérées
```

### Vérifier les capteurs I2C

```bash
# Lister les appareils I2C
i2cdetect -y 1

# Exemplaire de sortie:
#      0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
# 00:          -- -- -- -- -- -- -- -- -- -- -- -- --
# 10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 40: -- -- -- -- -- -- -- -- 48 -- -- -- -- -- -- --
# 50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 70: -- -- -- -- -- -- 76 --
```

- `48` = ADS1115 (qualité d'air)
- `76` = BME280 (température/humidité)

---

## 📋 Intégration dans votre code

### Exemple Node.js

```javascript
const sensors = require('./services/sensors');

// Initialiser au démarrage
await sensors.initializeSensors();

// Lire les capteurs
const data = await sensors.readAllSensors();
console.log(`Température: ${data.temperature}°C`);
console.log(`Humidité: ${data.humidity}%`);
```

### Exemple React

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function SensorWidget() {
  const [sensors, setSensors] = useState(null);

  useEffect(() => {
    const socket = io('http://localhost:3000');
    
    socket.on('sensor_data', (data) => {
      setSensors(data);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      <p>Température: {sensors?.temperature}°C</p>
      <p>Humidité: {sensors?.humidity}%</p>
    </div>
  );
}
```

---

## ⚠️ Troubleshooting

### Les capteurs ne sont pas détectés

1. Vérifier avec `i2cdetect -y 1`
2. Vérifier l'alimentation (GND, VCC)
3. Vérifier les câbles SDA/SCL
4. Les adresses I2C correspondent-elles?

### Le serveur n'écoute pas Socket.IO

- Vérifier que port 3000 est disponible
- Vérifier les logs: `tail -f logs/$(date +%Y-%m-%d).log`

### Les données affichent NaN

- Les capteurs ne sont probablement pas disponibles
- Le système utilise automatiquement les valeurs simulées
- Vérifiez les logs pour les avertissements

---

## 📝 Notes d'implémentation

- ✅ **Code isolé:** Aucune modification du code existant au-delà de l'init
- ✅ **Fallback robuste:** Fonctionne avec ou sans capteurs
- ✅ **Gestion d'erreurs:** Aucun crash, juste des logs d'avertissement
- ✅ **Nettoyage:** Les GPIO et I2C sont fermés proprement à l'arrêt
- ✅ **Socket.IO intelligent:** Démarre automatiquement avec le premier client

---

## 🔐 Sécurité

- CORS configurés pour accepter les connexions locales
- Pas de données sensibles exposées
- Logs sans informations critiques

---

## 📞 Support

En cas de problème:
1. Vérifier les logs dans `/logs/`
2. Vérifier le branchement matériel
3. Tester avec `curl` ou Postman
4. Vérifier la console du navigateur pour les erreurs JS
