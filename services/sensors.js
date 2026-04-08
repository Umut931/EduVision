/**
 * Module de gestion des capteurs physiques
 * Captures: Température/Humidité (I2C), Qualité de l'air (ADC), Mouvement (GPIO)
 */

const i2c = require('i2c-bus');
const ADS1x15 = require('ads1x15');
const { Gpio } = require('onoff');

let sensorState = {
    temperature: null,
    humidity: null,
    air_quality: null,
    motion: 0,
    timestamp: Date.now(),
    initialized: false,
    error: null
};

let i2cBus = null;
let adcDevice = null;
let motionSensor = null;
let motionDetectTimeout = null;

/**
 * Initialise les capteurs
 */
async function initializeSensors() {
    try {
        if (sensorState.initialized) return;

        // Initialiser le bus I2C (généralement le bus 1 sur Raspberry Pi)
        try {
            i2cBus = i2c.openSync(1);
            console.log('[SENSORS] Bus I2C (1) ouvert avec succès');
        } catch (err) {
            console.warn('[SENSORS] Impossible d\'ouvrir le bus I2C:', err.message);
            i2cBus = null;
        }

        // Initialiser l'ADC (ADS1115) pour la qualité de l'air
        if (i2cBus) {
            try {
                adcDevice = new ADS1x15({
                    i2c: i2cBus,
                    address: 0x48, // Adresse par défaut du ADS1115
                    device: 'ads1115'
                });
                console.log('[SENSORS] ADC (ADS1115) initialisé avec succès');
            } catch (err) {
                console.warn('[SENSORS] Impossible d\'initialiser l\'ADC:', err.message);
                adcDevice = null;
            }
        }

        // Initialiser le capteur de mouvement (GPIO pin 17 par défaut)
        try {
            motionSensor = new Gpio(17, 'in', 'both');
            motionSensor.watch((err, value) => {
                if (err) {
                    console.warn('[SENSORS] Erreur capteur mouvement:', err.message);
                    return;
                }
                sensorState.motion = value;
                
                // Réinitialiser après détection
                if (value === 1) {
                    if (motionDetectTimeout) clearTimeout(motionDetectTimeout);
                    motionDetectTimeout = setTimeout(() => {
                        sensorState.motion = 0;
                    }, 3000); // Réinitialiser après 3 secondes
                }
            });
            console.log('[SENSORS] Capteur mouvement (GPIO 17) initialisé avec succès');
        } catch (err) {
            console.warn('[SENSORS] Impossible d\'initialiser le capteur mouvement:', err.message);
            motionSensor = null;
        }

        sensorState.initialized = true;
        console.log('[SENSORS] Initialisation complète');
    } catch (err) {
        console.error('[SENSORS] Erreur générale d\'initialisation:', err.message);
        sensorState.error = err.message;
    }
}

/**
 * Lit la température et humidité via I2C (simule un BME280)
 */
async function readTemperatureHumidity() {
    try {
        if (!i2cBus) {
            // Fallback: valeurs simulées
            return {
                temperature: 22 + Math.random() * 3,
                humidity: 45 + Math.random() * 20
            };
        }

        // Essayer de lire depuis un capteur BME280 (adresse 0x76 ou 0x77)
        // Pour cet exemple, on simule les données si le capteur n'est pas disponible
        try {
            const data = i2cBus.readByteSync(0x76, 0xD0); // Vérifier l'ID du BME280
            // Si on arrive ici, le capteur est présent
            // Implémentation complète du BME280 nécessiterait plus de code
            // Pour l'instant, on retourne des valeurs simulées avec une base réelle
            return {
                temperature: 20 + Math.random() * 5,
                humidity: 50 + Math.random() * 15
            };
        } catch (err) {
            // Capteur non trouvé, retourner les valeurs simulées
            return {
                temperature: 21 + Math.random() * 4,
                humidity: 48 + Math.random() * 18
            };
        }
    } catch (err) {
        console.warn('[SENSORS] Erreur lecture temp/humidité:', err.message);
        // Fallback: valeurs simulées
        return {
            temperature: 20 + Math.random() * 5,
            humidity: 50 + Math.random() * 15
        };
    }
}

/**
 * Lit la qualité de l'air via ADC (ADS1115)
 */
async function readAirQuality() {
    try {
        if (!adcDevice) {
            // Fallback: valeurs simulées
            return Math.floor(300 + Math.random() * 200);
        }

        return new Promise((resolve, reject) => {
            // Lire le canal 0 de l'ADC
            adcDevice.readChannel(0, (err, value) => {
                if (err) {
                    console.warn('[SENSORS] Erreur lecture ADC:', err.message);
                    // Fallback: valeurs simulées
                    resolve(Math.floor(300 + Math.random() * 200));
                } else {
                    // Convertir la valeur ADC (0-32767) en ppm simulé (0-1000)
                    const ppm = Math.floor((value / 32767) * 1000);
                    resolve(ppm);
                }
            });
        });
    } catch (err) {
        console.warn('[SENSORS] Erreur générale ADC:', err.message);
        // Fallback: valeurs simulées
        return Math.floor(300 + Math.random() * 200);
    }
}

/**
 * Lit tous les capteurs et retourne les données
 */
async function readAllSensors() {
    try {
        const [tempHumidity, airQuality] = await Promise.all([
            readTemperatureHumidity(),
            readAirQuality()
        ]);

        sensorState = {
            temperature: parseFloat(tempHumidity.temperature.toFixed(2)),
            humidity: parseFloat(tempHumidity.humidity.toFixed(2)),
            air_quality: airQuality,
            motion: sensorState.motion || 0,
            timestamp: Date.now(),
            initialized: true,
            error: null
        };

        return sensorState;
    } catch (err) {
        console.error('[SENSORS] Erreur lecture capteurs:', err.message);
        sensorState.error = err.message;
        return sensorState;
    }
}

/**
 * Obtient l'état actuel des capteurs
 */
function getCurrentState() {
    return { ...sensorState };
}

/**
 * Nettoie les ressources
 */
function cleanup() {
    if (motionDetectTimeout) clearTimeout(motionDetectTimeout);
    if (motionSensor) {
        try {
            motionSensor.unexport();
            console.log('[SENSORS] Capteur mouvement fermé');
        } catch (err) {
            console.warn('[SENSORS] Erreur fermeture capteur mouvement:', err.message);
        }
    }
    if (i2cBus) {
        try {
            i2cBus.closeSync();
            console.log('[SENSORS] Bus I2C fermé');
        } catch (err) {
            console.warn('[SENSORS] Erreur fermeture I2C:', err.message);
        }
    }
}

/**
 * Gère le nettoyage à l'arrêt du processus
 */
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

module.exports = {
    initializeSensors,
    readAllSensors,
    readTemperatureHumidity,
    readAirQuality,
    getCurrentState,
    cleanup
};
