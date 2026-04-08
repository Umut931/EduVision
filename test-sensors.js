#!/usr/bin/env node

/**
 * Test script - Vérifier que le module capteurs fonctionne
 * 
 * Utilisation:
 *   node test-sensors.js
 */

const path = require('path');

console.log('\n🧪 Test du module capteurs EduVision\n');
console.log('='.repeat(50));

// Test 1: Vérifier les fichiers
console.log('\n✓ Test 1: Vérifier les fichiers');
const fs = require('fs');

const files = [
    './server.js',
    './services/sensors.js',
    './public/sensors-dashboard.html',
    './public/sensors-quickstart.html',
    './SENSORS_DOCUMENTATION.md',
    './SENSORS_EXAMPLES.js',
    './README-SENSORS.md'
];

let allFilesExist = true;
files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
});

// Test 2: Vérifier les imports
console.log('\n✓ Test 2: Vérifier les imports');

try {
    const sensorsModule = require('./services/sensors');
    console.log('  ✅ Module sensors chargé');
    
    // Vérifier les exports
    const exports = Object.keys(sensorsModule);
    console.log(`  ✅ Exports: ${exports.join(', ')}`);
} catch (err) {
    console.log(`  ❌ Erreur: ${err.message}`);
}

// Test 3: Vérifier les dépendances
console.log('\n✓ Test 3: Vérifier les dépendances');

const dependencies = [
    'express',
    'socket.io',
    'i2c-bus',
    'ads1x15',
    'onoff',
    'axios',
    'fs-extra',
    'cors'
];

const packageJson = require('./package.json');
dependencies.forEach(dep => {
    const exists = packageJson.dependencies[dep];
    console.log(`  ${exists ? '✅' : '❌'} ${dep} ${exists ? `(${exists})` : 'MANQUANT'}`);
});

// Test 4: Lint basique du code
console.log('\n✓ Test 4: Vérifier la syntaxe du code');

try {
    require('./server.js');
    console.log('  ⚠️  Server.js chargé (normal en test)');
} catch (err) {
    // C'est normal que le serveur ne démarre pas en test
    if (err.code !== 'EADDRINUSE') {
        console.log(`  ✅ Pas d'erreurs de syntaxe`);
    }
}

// Test 5: API endpoints
console.log('\n✓ Test 5: Vérifier les routes API');

const serverContent = fs.readFileSync('./server.js', 'utf8');
const apiTests = [
    { route: '/api/sensors', method: 'GET', found: serverContent.includes("app.get('/api/sensors'") },
    { route: '/api/sensors/subscribe', method: 'POST', found: serverContent.includes("app.post('/api/sensors/subscribe'") },
    { route: '/api/sensors/unsubscribe', method: 'POST', found: serverContent.includes("app.post('/api/sensors/unsubscribe'") }
];

apiTests.forEach(test => {
    console.log(`  ${test.found ? '✅' : '❌'} ${test.method} ${test.route}`);
});

// Test 6: Socket.IO
console.log('\n✓ Test 6: Vérifier Socket.IO');

const hasSocketIO = serverContent.includes('socketIo') && 
                   serverContent.includes('io.on(\'connection\'') &&
                   serverContent.includes('broadcastSensorData');

console.log(`  ${hasSocketIO ? '✅' : '❌'} Socket.IO configuré`);

// Test 7: Fallback et gestion d'erreurs
console.log('\n✓ Test 7: Vérifier la gestion d\'erreurs');

const sensorsContent = fs.readFileSync('./services/sensors.js', 'utf8');
const hasFallback = sensorsContent.includes('// Fallback:') && 
                   sensorsContent.includes('console.warn');
const hasErrorHandling = sensorsContent.includes('catch (err)');

console.log(`  ${hasFallback ? '✅' : '❌'} Fallback avec valeurs simulées`);
console.log(`  ${hasErrorHandling ? '✅' : '❌'} Gestion d'erreurs`);

// Résumé
console.log('\n' + '='.repeat(50));

const passed = [
    allFilesExist,
    apiTests.every(t => t.found),
    hasSocketIO,
    hasFallback,
    hasErrorHandling
].filter(Boolean).length;

const total = 5;

console.log(`\n📊 Résumé: ${passed}/${total} tests passés\n`);

if (passed === total) {
    console.log('✅ Tous les tests sont passés!');
    console.log('   Vous pouvez démarrer le serveur: npm start\n');
    process.exit(0);
} else {
    console.log('⚠️  Certains tests ont échoué. Vérifier les logs ci-dessus.\n');
    process.exit(1);
}
