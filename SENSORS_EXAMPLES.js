/**
 * EXEMPLES D'UTILISATION - Module Capteurs
 * ==========================================
 * Copier-coller ces exemples dans votre code pour intégrer les capteurs
 */

// ==========================================
// 1. UTILISER L'API REST (Fetch)
// ==========================================

/**
 * Récupérer les données des capteurs une fois
 */
async function readSensorsOnce() {
    try {
      const response = await fetch('/api/sensors');
      const result = await response.json();
      
      if (result.success) {
        const { temperature, humidity, air_quality, motion } = result.data;
        console.log(`🌡️ Température: ${temperature}°C`);
        console.log(`💧 Humidité: ${humidity}%`);
        console.log(`💨 Qualité air: ${air_quality} ppm`);
        console.log(`🚀 Mouvement: ${motion ? 'Détecté' : 'Inactif'}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
}

// Utilisation
readSensorsOnce();


// ==========================================
// 2. UTILISER SOCKET.IO (Temps réel)
// ==========================================

/**
 * Connexion Socket.IO pour recevoir les données en temps réel
 */
function connectSocketIO() {
    // Importer Socket.IO (déjà sur la page si vous êtes sur /sensors-dashboard.html)
    // <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
        console.log('✅ Connecté au serveur');
        
        // Déclencher la transmission des capteurs
        fetch('/api/sensors/subscribe', { method: 'POST' });
    });

    socket.on('sensor_data', (data) => {
        console.log('📊 Données capteurs:', data);
        
        // Afficher les données
        showSensorData(data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Déconnecté du serveur');
    });

    socket.on('error', (error) => {
        console.error('⚠️ Erreur Socket.IO:', error);
    });

    return socket;
}

function showSensorData(data) {
    const temp = data.temperature.toFixed(2);
    const humid = data.humidity.toFixed(2);
    const air = data.air_quality;
    const motion = data.motion ? 'Détecté' : 'Inactif';
    
    // Mettre à jour le DOM
    document.getElementById('temp').textContent = temp;
    document.getElementById('humidity').textContent = humid;
    document.getElementById('air').textContent = air;
    document.getElementById('motion').textContent = motion;
}

// Utilisation
const socket = connectSocketIO();

// Arrêter à la fin
// socket.disconnect();


// ==========================================
// 3. AFFICHAGE SIMPLE EN HTML
// ==========================================

/**
 * Widget HTML simple pour afficher les capteurs
 */
const htmlTemplate = `
<div class="sensors-widget">
    <h2>📊 Capteurs</h2>
    <div class="sensor-row">
        <span>🌡️ Température:</span>
        <strong id="temp-display">--</strong>°C
    </div>
    <div class="sensor-row">
        <span>💧 Humidité:</span>
        <strong id="humidity-display">--</strong>%
    </div>
    <div class="sensor-row">
        <span>💨 Qualité air:</span>
        <strong id="air-display">--</strong> ppm
    </div>
    <div class="sensor-row">
        <span>🚀 Mouvement:</span>
        <strong id="motion-display">Inactif</strong>
    </div>
</div>

<style>
    .sensors-widget {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        font-family: Arial, sans-serif;
    }
    
    .sensor-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #ddd;
    }
    
    .sensor-row:last-child {
        border-bottom: none;
    }
</style>
`;


// ==========================================
// 4. INTÉGRATION AVEC REACT
// ==========================================

/**
 * Hook React pour les capteurs
 */
// Sauvegardez dans: src/hooks/useSensors.js

// import { useEffect, useState } from 'react';
// import io from 'socket.io-client';

// export function useSensors() {
//     const [sensors, setSensors] = useState({
//         temperature: null,
//         humidity: null,
//         air_quality: null,
//         motion: 0
//     });
//     const [connected, setConnected] = useState(false);

//     useEffect(() => {
//         const socket = io('http://localhost:3000');

//         socket.on('connect', () => {
//             setConnected(true);
//             fetch('/api/sensors/subscribe', { method: 'POST' });
//         });

//         socket.on('sensor_data', (data) => {
//             setSensors(data);
//         });

//         socket.on('disconnect', () => {
//             setConnected(false);
//         });

//         return () => socket.disconnect();
//     }, []);

//     return { sensors, connected };
// }

/**
 * Utilisation dans un composant React
 */
// import { useSensors } from './hooks/useSensors';

// export function SensorDashboard() {
//     const { sensors, connected } = useSensors();

//     return (
//         <div className="sensors-dashboard">
//             <h1>Capteurs</h1>
//             <p>Connexion: {connected ? '✅ Connecté' : '❌ Déconnecté'}</p>
            
//             <div className="sensor">
//                 <p>🌡️ Température: {sensors.temperature?.toFixed(2)}°C</p>
//             </div>
//             <div className="sensor">
//                 <p>💧 Humidité: {sensors.humidity?.toFixed(2)}%</p>
//             </div>
//             <div className="sensor">
//                 <p>💨 Qualité: {sensors.air_quality} ppm</p>
//             </div>
//             <div className="sensor">
//                 <p>🚀 Mouvement: {sensors.motion ? 'Détecté' : 'Inactif'}</p>
//             </div>
//         </div>
//     );
// }


// ==========================================
// 5. INTÉGRATION AVEC VANILLA JS + CHART.JS
// ==========================================

/**
 * Graphique en direct des capteurs avec Chart.js
 */

// <!-- Dans votre HTML -->
// <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
// <canvas id="temperatureChart"></canvas>

// const temperatureChart = new Chart(
//     document.getElementById('temperatureChart'),
//     {
//         type: 'line',
//         data: {
//             labels: [],
//             datasets: [{
//                 label: 'Température (°C)',
//                 data: [],
//                 borderColor: '#ff6b6b',
//                 backgroundColor: 'rgba(255, 107, 107, 0.1)',
//                 tension: 0.4
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { display: true }
//             },
//             scales: {
//                 y: { beginAtZero: true }
//             }
//         }
//     }
// );

// const socket = io('http://localhost:3000');
// let temperatureData = [];

// socket.on('sensor_data', (data) => {
//     const now = new Date().toLocaleTimeString();
//     temperatureData.push(data.temperature);
    
//     // Garder seulement les 30 dernières mesures
//     if (temperatureData.length > 30) {
//         temperatureData.shift();
//         temperatureChart.data.labels.shift();
//     }
    
//     temperatureChart.data.labels.push(now);
//     temperatureChart.data.datasets[0].data = temperatureData;
//     temperatureChart.update();
// });


// ==========================================
// 6. SAUVEGARDE DES DONNÉES DANS UNE BDD
// ==========================================

/**
 * Exemple: Envoyer les données à un endpoint pour la sauvegarde
 */
async function saveSensorDataToDatabase(data) {
    try {
        const response = await fetch('/api/sensors/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                temperature: data.temperature,
                humidity: data.humidity,
                air_quality: data.air_quality,
                motion: data.motion,
                timestamp: new Date()
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Données sauvegardées');
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
    }
}

// Vous devrez créer l'endpoint POST /api/sensors/save dans server.js


// ==========================================
// 7. ALERTES ET CONDITIONS
// ==========================================

/**
 * Générer des alertes basées sur les seuils des capteurs
 */
function checkSensorThresholds(data) {
    const alerts = [];

    // Alerte température élevée
    if (data.temperature > 28) {
        alerts.push('🔴 Température trop haute: ' + data.temperature + '°C');
    }

    // Alerte humidité élevée
    if (data.humidity > 70) {
        alerts.push('🟡 Humidité élevée: ' + data.humidity + '%');
    }

    // Alerte qualité d'air
    if (data.air_quality > 800) {
        alerts.push('🔴 Qualité d\'air médiocre: ' + data.air_quality + ' ppm');
    }

    // Mouvement détecté
    if (data.motion === 1) {
        alerts.push('🚀 Mouvement détecté!');
    }

    return alerts;
}

// Utilisation avec Socket.IO
// socket.on('sensor_data', (data) => {
//     const alerts = checkSensorThresholds(data);
//     alerts.forEach(alert => console.warn(alert));
// });


// ==========================================
// 8. EXPORT CSV DES CAPTEURS
// ==========================================

/**
 * Exporter les données des capteurs en CSV
 */
function exportSensorsToCSV() {
    // Récupérer les données actuelles
    fetch('/api/sensors')
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                const data = result.data;
                const csv =
                    'Temperature (°C),Humidity (%),Air Quality (ppm),Motion,Timestamp\n' +
                    `${data.temperature},${data.humidity},${data.air_quality},${data.motion},${new Date(data.timestamp).toISOString()}`;

                // Créer et télécharger le fichier
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sensors_' + Date.now() + '.csv';
                a.click();
            }
        });
}


// ==========================================
// 9. MONITORING ET LOGGING
// ==========================================

/**
 * Logger les données des capteurs pour le débogage
 */
function enableSensorLogging() {
    const socket = io('http://localhost:3000');
    let logCount = 0;

    socket.on('sensor_data', (data) => {
        logCount++;
        console.table({
            'Numéro': logCount,
            'Température': data.temperature + '°C',
            'Humidité': data.humidity + '%',
            'Qualité air': data.air_quality + ' ppm',
            'Mouvement': data.motion ? 'Oui' : 'Non',
            'Heure': new Date(data.timestamp).toLocaleTimeString()
        });
    });
}


// ==========================================
// 10. TEST D'INTÉGRATION
// ==========================================

/**
 * Fonction de test complète
 */
async function testSensors() {
    console.log('🧪 Test des capteurs...\n');

    // 1. Test API REST
    console.log('1️⃣ Test API REST...');
    try {
        const response = await fetch('/api/sensors');
        const result = await response.json();
        if (result.success) {
            console.log('✅ API REST OK');
            console.log(result.data);
        }
    } catch (error) {
        console.error('❌ Erreur API REST:', error);
    }

    // 2. Test Socket.IO
    console.log('\n2️⃣ Test Socket.IO...');
    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
        console.log('✅ Socket.IO connecté');
        
        // Activer le flux
        fetch('/api/sensors/subscribe', { method: 'POST' })
            .then(() => console.log('✅ Flux activé'));
        
        // Écouter une message
        let count = 0;
        socket.on('sensor_data', (data) => {
            count++;
            console.log(`✅ Message ${count} reçu:`, data);
            
            if (count >= 3) {
                socket.disconnect();
                console.log('✅ Test Socket.IO complété');
            }
        });
    });

    socket.on('error', (err) => {
        console.error('❌ Erreur Socket.IO:', err);
    });
}

// Utilisation
// testSensors();
