// defilement-auto.js
// Gère le bouton et l'affichage automatique météo, pronote, heure


let defilementAutoInterval = null;
let defilementAutoIndex = 0;

// Stockage des événements ICS
let evenementsIcs = [];
let evenementsIcsCharges = false;

// URLs ICS
const URL_ICS_API = "https://0750711r.index-education.net/pronote/ical/mesinformations.ics?icalsecurise=2B3753E050B35B169E18C7624BB7DA25F623F2DFE26654D9AC4F54FE775E35858B3C20E8ABB0FFD0D9AB7F9C6FF1CC70&version=2025.2.10&param=900A75DF9ED8C62E212781A9E4DCC937";
const URL_ICS_LOCAL = "/event.ics";

// Fonction pour parser ICS (simple)
function parseICS(icsText) {
    const events = [];
    const regexEvent = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    let match;
    while ((match = regexEvent.exec(icsText)) !== null) {
        const evtText = match[1];
        const getField = (field) => {
            const reg = new RegExp(field + ":([^\n\r]*)");
            const m = evtText.match(reg);
            return m ? m[1].trim() : "";
        };
        events.push({
            summary: getField("SUMMARY;LANGUAGE=fr") || getField("SUMMARY") || "",
            description: getField("DESCRIPTION;LANGUAGE=fr") || getField("DESCRIPTION") || "",
            dtstart: getField("DTSTART") || getField("DTSTART;VALUE=DATE") || "",
            dtend: getField("DTEND") || getField("DTEND;VALUE=DATE") || "",
            location: getField("LOCATION") || ""
        });
    }
    return events;
}

// Charge les deux ICS (API et local)
function chargerEvenementsIcs(callback) {
    if (evenementsIcsCharges) { callback && callback(); return; }
    Promise.all([
        fetch(URL_ICS_API).then(r => r.text()).catch(() => ""),
        fetch(URL_ICS_LOCAL).then(r => r.text()).catch(() => "")
    ]).then(([icsApi, icsLocal]) => {
        evenementsIcs = [
            ...parseICS(icsApi),
            ...parseICS(icsLocal)
        ].filter(e => e.summary);
        // Trie par date
        evenementsIcs.sort((a, b) => (a.dtstart || "").localeCompare(b.dtstart || ""));
        evenementsIcsCharges = true;
        callback && callback();
    });
}

function arreterDefilementAuto() {
    if (defilementAutoInterval) {
        clearInterval(defilementAutoInterval);
        defilementAutoInterval = null;
    }
    defilementAutoIndex = 0;
    // Remet les écrans clients en mode documents
    if (typeof setClientDisplayPage === 'function') {
        setClientDisplayPage('documents');
    }
}

function lancerDefilementAuto() {
    // Passe en plein écran
    const containerPleinEcran = document.getElementById('container-plein-ecran');
    const contenuPleinEcran = document.getElementById('contenu-plein-ecran');
    if (!containerPleinEcran || !contenuPleinEcran) return;
    containerPleinEcran.style.display = '';
    document.getElementById('container-principal').style.display = 'none';

    // Désactive le scroll pour la météo en mode défilement
    contenuPleinEcran.style.overflow = 'hidden';

    // Ajoute un écran pour les événements ICS
    defilementAutoIndex = 0;
    chargerEvenementsIcs(() => {
        afficherDefilementAutoPleinEcran();
        if (defilementAutoInterval) clearInterval(defilementAutoInterval);
        defilementAutoInterval = setInterval(() => {
            defilementAutoIndex = (defilementAutoIndex + 1) % 5;
            afficherDefilementAutoPleinEcran();
        }, 10000);
    });
}

function afficherDefilementAutoPleinEcran() {
    const contenuPleinEcran = document.getElementById('contenu-plein-ecran');
    const header = document.getElementById('plein-ecran-header');
    if (header) header.style.display = '';
    if (!contenuPleinEcran) return;
    if (defilementAutoIndex === 0) {
        // Météo centrée
        setClientDisplayPage('meteo');
        if (typeof afficherMeteo === 'function') {
            afficherMeteo(contenuPleinEcran, true);
            setTimeout(() => {
                contenuPleinEcran.style.display = 'flex';
                contenuPleinEcran.style.flexDirection = 'column';
                contenuPleinEcran.style.alignItems = 'center';
                contenuPleinEcran.style.justifyContent = 'center';
                contenuPleinEcran.style.height = '90vh';
                // Centrage et agrandissement du bloc météo
                const meteoContainer = contenuPleinEcran.querySelector('.meteo-container');
                if (meteoContainer) {
                    meteoContainer.style.margin = '0 auto';
                    meteoContainer.style.maxWidth = '800px';
                    meteoContainer.style.width = '100%';
                    meteoContainer.style.transform = 'scale(1.25)';
                }
            }, 100);
        } else {
            contenuPleinEcran.innerHTML = '<div>Chargement météo...</div>';
        }
    } else if (defilementAutoIndex === 1) {
        // Pronote
        contenuPleinEcran.style.display = '';
        contenuPleinEcran.style.flexDirection = '';
        contenuPleinEcran.style.alignItems = '';
        contenuPleinEcran.style.justifyContent = '';
        if (typeof afficherPronote === 'function') {
            afficherPronote(contenuPleinEcran, true);
        } else {
            contenuPleinEcran.innerHTML = '<div>Chargement emploi du temps...</div>';
        }
    } else if (defilementAutoIndex === 2) {
        // Heure
        setClientDisplayPage('horloge');
        contenuPleinEcran.style.display = '';
        contenuPleinEcran.style.flexDirection = '';
        contenuPleinEcran.style.alignItems = '';
        contenuPleinEcran.style.justifyContent = '';
        afficherHeureDefilementAutoPleinEcran();
    } else if (defilementAutoIndex === 3) {
        // Événements ICS
        setClientDisplayPage('events');
        contenuPleinEcran.style.display = '';
        contenuPleinEcran.style.flexDirection = '';
        contenuPleinEcran.style.alignItems = '';
        contenuPleinEcran.style.justifyContent = '';
        afficherEvenementsIcs(contenuPleinEcran);
    } else if (defilementAutoIndex === 4) {
        // Capteurs
        setClientDisplayPage('sensors');
        contenuPleinEcran.style.display = '';
        contenuPleinEcran.style.flexDirection = '';
        contenuPleinEcran.style.alignItems = '';
        contenuPleinEcran.style.justifyContent = '';
        afficherCapteursDefilementAuto(contenuPleinEcran);
    }
}

// Affiche les événements ICS dans le défilement
function afficherEvenementsIcs(cible) {
    if (!evenementsIcsCharges) {
        cible.innerHTML = '<div>Chargement des événements de l\'établissement...</div>';
        return;
    }
    if (!evenementsIcs.length) {
            cible.innerHTML = '<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;justify-content:center;align-items:center;font-size:2.5em;z-index:10;">Aucun événement à afficher.</div>';
        return;
    }
    // Affiche les 5 prochains événements
    const now = new Date();
    const eventsFuturs = evenementsIcs.filter(e => {
        // Prend les événements à partir d'aujourd'hui
        if (!e.dtstart) return false;
        // Format YYYYMMDD ou YYYYMMDDTHHmmssZ
        let dateEvt = e.dtstart;
        if (dateEvt.length === 8) dateEvt += 'T000000Z';
        const d = new Date(dateEvt.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
        return d >= now;
    }).slice(0, 5);
    let html = `<h2 style="text-align:center;">📅 Événements de l'établissement</h2><div class="ics-events-list">`;
    if (!eventsFuturs.length) {
        html += '<div style="display:flex;justify-content:center;align-items:center;height:40vh;font-size:2em;">Aucun événement à venir.</div>';
    } else {
        eventsFuturs.forEach(e => {
            // Formatage date
            let dateStr = e.dtstart;
            if (dateStr.length === 8) {
                dateStr = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1');
            } else if (dateStr.length >= 15) {
                // YYYYMMDDTHHmmssZ
                dateStr = dateStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/, '$3/$2/$1 $4:$5');
            }
            html += `<div class="ics-event" style="margin-bottom:2em;text-align:center;">
                <div class="ics-event-title" style="font-size:1.5em;font-weight:600;">${e.summary}</div>
                <div class="ics-event-date" style="font-size:1.2em;color:#7ecfff;">${dateStr}</div>
                ${e.description ? `<div class="ics-event-desc" style="margin-top:0.5em;">${e.description.replace(/\\n/g, '<br>')}</div>` : ''}
            </div>`;
        });
    }
    html += '</div>';
    cible.innerHTML = html;
}

function afficherHeureDefilementAutoPleinEcran() {
    const contenuPleinEcran = document.getElementById('contenu-plein-ecran');
    if (!contenuPleinEcran) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    contenuPleinEcran.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;">
        <div style="font-size:10em;font-weight:700;line-height:1;">${h}:${m}</div>
        <div style="text-align:center;font-size:2em;margin-top:0.5em;">Heure actuelle</div>
    </div>`;
}

function afficherDefilementAuto() {
    const affichage = document.getElementById('defilement-auto-affichage');
    if (!affichage) return;
    if (defilementAutoIndex === 0) {
        // Météo
        if (typeof afficherMeteo === 'function') {
            afficherMeteo(affichage, true);
        } else {
            affichage.innerHTML = '<div>Chargement météo...</div>';
        }
    } else if (defilementAutoIndex === 1) {
        // Pronote
        if (typeof afficherPronote === 'function') {
            afficherPronote(affichage, true);
        } else {
            affichage.innerHTML = '<div>Chargement emploi du temps...</div>';
        }
    } else {
        // Heure
        afficherHeureDefilementAuto();
    }
}

function afficherHeureDefilementAuto() {
    const affichage = document.getElementById('defilement-auto-affichage');
    if (!affichage) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    affichage.innerHTML = `<div style="font-size:3em;text-align:center;">${h}:${m}</div><div style="text-align:center;">Heure actuelle</div>`;
}

function afficherCapteursDefilementAuto(cible) {
    cible.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;font-size:1.5em;">Chargement des capteurs...</div>';

    fetch('/api/sensors')
        .then(r => r.json())
        .then(res => {
            const d = res.data || {};

            const getQualiteAir = (val) => {
                if (val === null || val === undefined) return { label: '—', color: '#aaa' };
                if (val < 50)  return { label: 'Excellente', color: '#27ae60' };
                if (val < 100) return { label: 'Bonne', color: '#2ecc71' };
                if (val < 150) return { label: 'Moyenne', color: '#f39c12' };
                if (val < 200) return { label: 'Mauvaise', color: '#e67e22' };
                return { label: 'Très mauvaise', color: '#e74c3c' };
            };

            const qualite = getQualiteAir(d.air_quality);
            const temp = d.temperature !== null && d.temperature !== undefined ? d.temperature + '°C' : '—';
            const hum  = d.humidity    !== null && d.humidity    !== undefined ? d.humidity    + '%'  : '—';
            const mouvement = d.motion ? '🔴 Mouvement détecté' : '🟢 Aucun mouvement';

            cible.innerHTML = `
                <div style="padding:40px;width:100%;box-sizing:border-box;">
                    <h2 style="text-align:center;font-size:2em;margin-bottom:40px;">📡 Capteurs de la salle</h2>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:800px;margin:0 auto;">
                        <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:30px;text-align:center;">
                            <div style="font-size:3em;">🌡️</div>
                            <div style="font-size:2.5em;font-weight:700;margin-top:10px;">${temp}</div>
                            <div style="opacity:0.7;margin-top:6px;">Température</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:30px;text-align:center;">
                            <div style="font-size:3em;">💧</div>
                            <div style="font-size:2.5em;font-weight:700;margin-top:10px;">${hum}</div>
                            <div style="opacity:0.7;margin-top:6px;">Humidité</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:30px;text-align:center;">
                            <div style="font-size:3em;">🌬️</div>
                            <div style="font-size:2em;font-weight:700;margin-top:10px;color:${qualite.color};">${qualite.label}</div>
                            <div style="opacity:0.7;margin-top:6px;">Qualité de l'air${d.air_quality !== null && d.air_quality !== undefined ? ' (' + d.air_quality + ')' : ''}</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:16px;padding:30px;text-align:center;">
                            <div style="font-size:3em;">👁️</div>
                            <div style="font-size:1.4em;font-weight:700;margin-top:10px;">${mouvement}</div>
                            <div style="opacity:0.7;margin-top:6px;">Détection</div>
                        </div>
                    </div>
                </div>`;
        })
        .catch(() => {
            cible.innerHTML = '<div style="text-align:center;padding:40px;">❌ Erreur lecture des capteurs</div>';
        });
}

// Met à jour l'heure en direct si affichée
setInterval(() => {
    // Met à jour l'heure en direct si affichée
    const containerPleinEcran = document.getElementById('container-plein-ecran');
    if (containerPleinEcran && containerPleinEcran.style.display !== 'none' && defilementAutoIndex === 2) {
        afficherHeureDefilementAutoPleinEcran();
    }
}, 1000);