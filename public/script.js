// Variables et fonctions communes
let contenuActif = null;
let modePleinEcran = false;
let modeFocus = false;
let adminSocket = null;

function initAdminSocket() {
    if (typeof io !== 'function') return;
    adminSocket = io();
    adminSocket.on('connect', () => {
        console.log('Admin WebSocket connecté');
    });
    adminSocket.on('disconnect', () => {
        console.log('Admin WebSocket déconnecté');
    });
    adminSocket.on('error', (err) => {
        console.warn('Erreur WebSocket admin :', err);
    });
}

function changerContenu(type) {
    const contenu = document.getElementById('contenu');
    contenu.classList.add('active');
    contenuActif = type;
}

function setClientDisplayPage(page) {
    if (adminSocket && typeof adminSocket.emit === 'function') {
        adminSocket.emit('change-display-page', { page });
        return;
    }
    fetch('/api/display-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page })
    }).catch(err => console.warn('Erreur HTTP display-page:', err));
}

function entrerModePleinEcran(titre) {
    modePleinEcran = true;
    modeFocus = false;
    const containerPrincipal = document.getElementById('container-principal');
    const containerPleinEcran = document.getElementById('container-plein-ecran');
    const header = document.getElementById('plein-ecran-header');
    const titrePleinEcran = document.getElementById('titre-plein-ecran');
    const btnFocus = document.getElementById('btn-focus');

    // Afficher le mode plein écran
    containerPrincipal.style.display = 'none';
    containerPleinEcran.style.display = 'block';
    header.style.display = 'flex';
    titrePleinEcran.textContent = titre;

    // Afficher le bouton focus pour l'horloge uniquement
    if (titre.includes('Horloge')) {
        btnFocus.style.display = 'inline-block';
    } else {
        btnFocus.style.display = 'none';
    }

    // Appliquer les styles plein écran
    document.body.style.margin = '0';
    document.body.style.padding = '0';
}

function quitterModePleinEcran() {
    modePleinEcran = false;
    modeFocus = false;
    const containerPrincipal = document.getElementById('container-principal');
    const containerPleinEcran = document.getElementById('container-plein-ecran');
    const header = document.getElementById('plein-ecran-header');

    // Retourner à la vue normale
    containerPrincipal.style.display = 'block';
    containerPleinEcran.style.display = 'none';
    header.style.display = 'none';
    document.body.style.margin = '';
    document.body.style.padding = '';
}

function afficherAccueil() {
    quitterModePleinEcran();
}

function basculerModeFocus() {
    const header = document.getElementById('plein-ecran-header');
    const containerPleinEcran = document.getElementById('container-plein-ecran');
    const btnFocus = document.getElementById('btn-focus');

    modeFocus = !modeFocus;

    if (modeFocus) {
        // Entrer en mode focus
        header.style.display = 'none';
        containerPleinEcran.style.top = '0';
        containerPleinEcran.style.height = '100vh';
        btnFocus.textContent = '⬜ Normal';
        btnFocus.style.display = 'none';
    } else {
        // Quitter le mode focus
        header.style.display = 'flex';
        containerPleinEcran.style.top = '70px';
        containerPleinEcran.style.height = 'calc(100vh - 70px)';
        btnFocus.textContent = '🎯 Focus';
        btnFocus.style.display = 'inline-block';
    }
}

/**
 * Convertit un champ Pronote en texte affichable
 * - accepte: {val: "..."} / "..." / undefined
 */
function getVal(field, fallback = "—") {
    if (field === undefined || field === null) return fallback;

    if (typeof field === "string") {
        const s = field.trim();
        return s.length ? s : fallback;
    }

    if (typeof field === "object") {
        if ("val" in field) {
            const v = field.val;
            if (v === undefined || v === null) return fallback;
            const s = String(v).trim();
            return s.length ? s : fallback;
        }
        if ("value" in field) {
            const v = field.value;
            if (v === undefined || v === null) return fallback;
            const s = String(v).trim();
            return s.length ? s : fallback;
        }
    }

    return fallback;
}

/**
 * Affiche l'emploi du temps dans la page "contenu" (vue normale)
 * + version safe (aucun undefined)
 */
function afficherPronote() {
    setClientDisplayPage('pronote');
    const contenu = document.getElementById('contenu');

    contenu.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Chargement de l'emploi du temps...</p>
        </div>
    `;

    fetch('/api/pronote')
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                contenu.innerHTML = `<div class="erreur">${data.message || "Erreur inconnue"}</div>`;
                return;
            }

            const edt = data.data || {};
            const coursList = Array.isArray(edt.cours) ? edt.cours : [];

            let html = `
                <h2>📅 Emploi du Temps - ${edt.jour || ""} ${edt.date || ""}</h2>
            `;

            if (coursList.length === 0) {
                html += `<p>Aucun cours aujourd'hui.</p>`;
            } else {
                coursList.forEach(cours => {
                    html += `
                        <div class="pronote-cours">
                            <h4>${getVal(cours.matiere)}</h4>
                            <p><strong>Heure :</strong> ${getVal(cours.heure)}</p>
                            <p><strong>Salle :</strong> ${getVal(cours.salle)}</p>
                            <p><strong>Professeur :</strong> ${getVal(cours.professeur)}</p>
                        </div>
                    `;
                });
            }

            if (edt.message) {
                html += `<div class="erreur" style="background:#fdcb6e;color:#333;margin-top:20px;">${edt.message}</div>`;
            }

            contenu.innerHTML = html;
        })
        .catch(err => {
            contenu.innerHTML = `<div class="erreur">Erreur : ${err.message}</div>`;
        });
}

function afficherControlesAffichage() {
    entrerModePleinEcran('📺 Contrôles d\'affichage');
    
    const contenu = document.getElementById('contenu-plein-ecran');
    contenu.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h2>Contrôles d'affichage pour les clients</h2>
            <p>Choisissez ce que les Raspberry clients doivent afficher :</p>
            
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 30px;">
                <button id="btn-mode-documents" class="btn-camera" style="padding: 20px; font-size: 1.1em; min-width: 140px;">
                    📄 Documents
                </button>
                <button id="btn-mode-camera" class="btn-camera" style="padding: 20px; font-size: 1.1em; min-width: 140px;">
                    📷 Caméra
                </button>
                <button id="btn-mode-meteo" class="btn-camera" style="padding: 20px; font-size: 1.1em; min-width: 140px;">
                    🌤️ Météo
                </button>
                <button id="btn-mode-pronote" class="btn-camera" style="padding: 20px; font-size: 1.1em; min-width: 140px;">
                    📅 Emploi du temps
                </button>
                <button id="btn-mode-horloge" class="btn-camera" style="padding: 20px; font-size: 1.1em; min-width: 140px;">
                    🕐 Horloge
                </button>
            </div>
            
            <div id="status-mode" style="margin-top: 30px; font-size: 1.1em;">
                Chargement du mode actuel...
            </div>
        </div>
    `;
    
    // Charger le mode actuel
    chargerModeActuel();
    
    // Événements des boutons
    document.getElementById('btn-mode-documents').onclick = () => changerModeAffichage('documents');
    document.getElementById('btn-mode-camera').onclick = () => changerModeAffichage('camera');
    document.getElementById('btn-mode-meteo').onclick = () => setClientDisplayPage('meteo');
    document.getElementById('btn-mode-pronote').onclick = () => setClientDisplayPage('pronote');
    document.getElementById('btn-mode-horloge').onclick = () => setClientDisplayPage('horloge');
}

function chargerModeActuel() {
    fetch('/api/display-mode')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const statusDiv = document.getElementById('status-mode');
                statusDiv.innerHTML = `Mode actuel : <strong>${data.mode === 'documents' ? 'Documents' : 'Caméra'}</strong>`;
                
                // Mettre à jour les boutons
                document.getElementById('btn-mode-documents').style.background = data.mode === 'documents' ? '#667eea' : '';
                document.getElementById('btn-mode-camera').style.background = data.mode === 'camera' ? '#667eea' : '';
            }
        })
        .catch(err => {
            document.getElementById('status-mode').innerHTML = 'Erreur de chargement du mode';
        });
}

function changerModeAffichage(mode) {
    fetch('/api/display-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            chargerModeActuel();
            alert(`Mode changé à : ${mode === 'documents' ? 'Documents' : 'Caméra'}`);
        } else {
            alert('Erreur : ' + data.message);
        }
    })
    .catch(err => {
        alert('Erreur de changement de mode');
    });
}

window.addEventListener('load', initAdminSocket);
