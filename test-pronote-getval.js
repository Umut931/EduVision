// Tests unitaires pour getVal() — node test-pronote-getval.js
const assert = require('assert');

// Copie locale de getVal() (même implémentation que public/pronote.js)
function getVal(field, fallback = "—") {
    if (field === undefined || field === null) return fallback;

    if (typeof field === "object") {
        const v = field.val !== undefined ? field.val : field.value;
        return (v !== undefined && v !== null) ? (String(v).trim() || fallback) : fallback;
    }

    if (typeof field === "string") {
        const s = field.trim();
        if (!s) return fallback;
        if (s.charCodeAt(0) === 123 && s.includes('"val"')) {
            try {
                const parsed = JSON.parse(s);
                if (parsed && parsed.val !== undefined && parsed.val !== null) {
                    return String(parsed.val).trim() || fallback;
                }
            } catch {}
        }
        return s;
    }

    return String(field).trim() || fallback;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
    }
}

console.log('\ngetVal() — tests unitaires\n');

// --- Cas string simple ---
console.log('String simple');
test('string non-vide reste inchangée', () => {
    assert.strictEqual(getVal('Mathématiques'), 'Mathématiques');
});
test('string avec espaces est trimmée', () => {
    assert.strictEqual(getVal('  Anglais  '), 'Anglais');
});
test('string vide retourne le fallback', () => {
    assert.strictEqual(getVal(''), '—');
    assert.strictEqual(getVal('   '), '—');
});
test('string vide retourne un fallback personnalisé', () => {
    assert.strictEqual(getVal('', 'N/A'), 'N/A');
});

// --- Objet localisé node-ical { params, val } ---
console.log('\nObjet localisé { params, val }');
test('extrait .val depuis un objet localisé', () => {
    assert.strictEqual(getVal({ params: { LANGUAGE: 'fr' }, val: 'Mathématiques' }), 'Mathématiques');
});
test('extrait .val pour une salle', () => {
    assert.strictEqual(getVal({ params: { LANGUAGE: 'fr' }, val: 'J-329 - salle banale' }), 'J-329 - salle banale');
});
test('extrait .val pour un professeur', () => {
    assert.strictEqual(getVal({ params: { LANGUAGE: 'fr' }, val: 'M. Dupont' }), 'M. Dupont');
});
test('extrait .value si .val absent', () => {
    assert.strictEqual(getVal({ value: 'Accomp. perso.' }), 'Accomp. perso.');
});
test('objet sans .val ni .value retourne le fallback', () => {
    assert.strictEqual(getVal({ params: {} }), '—');
});

// --- JSON sérialisé (cas serveur non corrigé) ---
console.log('\nJSON sérialisé (garde-fou)');
test('string JSON avec "val" est déparsée', () => {
    const raw = '{"params":{"LANGUAGE":"fr"},"val":"Anglais"}';
    assert.strictEqual(getVal(raw), 'Anglais');
});
test('string JSON matière avec accents', () => {
    const raw = '{"params":{"LANGUAGE":"fr"},"val":"Accomp. perso."}';
    assert.strictEqual(getVal(raw), 'Accomp. perso.');
});

// --- Valeurs nulles / undefined ---
console.log('\nValeurs nulles / undefined');
test('null retourne le fallback', () => {
    assert.strictEqual(getVal(null), '—');
});
test('undefined retourne le fallback', () => {
    assert.strictEqual(getVal(undefined), '—');
});
test('null avec fallback personnalisé', () => {
    assert.strictEqual(getVal(null, 'Non précisé'), 'Non précisé');
});
test('undefined avec fallback personnalisé', () => {
    assert.strictEqual(getVal(undefined, 'Non précisé'), 'Non précisé');
});

// --- Autres types ---
console.log('\nAutres types');
test('nombre converti en string', () => {
    assert.strictEqual(getVal(42), '42');
});

console.log(`\n${passed} passé(s), ${failed} échoué(s)\n`);
if (failed > 0) process.exit(1);
