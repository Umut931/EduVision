// pronote.js (version clean, sans {"params"...})

function getVal(field, fallback = "—") {
    if (field === undefined || field === null) return fallback;

    // Si c'est un objet avec .val, on prend .val
    if (typeof field === "object" && field.val !== undefined && field.val !== null) {
        return String(field.val).trim() || fallback;
    }

    // Si c'est une string qui ressemble à du JSON avec "val"
    if (typeof field === "string") {
        const s = field.trim();
        // Si c'est du JSON, on extrait la valeur
        if (s.startsWith("{") && s.includes('"val"')) {
            try {
                const parsed = JSON.parse(s);
                if (parsed && parsed.val !== undefined && parsed.val !== null) {
                    return String(parsed.val).trim() || fallback;
                }
            } catch {}
        }
        // Si c'est une string qui contient ce motif, on extrait avec une regex
        const match = s.match(/"val"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
            return match[1].trim();
        }
        // Sinon, on retire les accolades et "params" si présents
        if (s.includes('params') && s.includes('val')) {
            // On tente d'extraire ce qui suit 'val":'
            const afterVal = s.split('val')[1];
            if (afterVal) {
                const valClean = afterVal.replace(/[:\s"'}]+/g, '').trim();
                if (valClean.length > 0) return valClean;
            }
        }
        return s.length ? s : fallback;
    }

    return String(field).trim() || fallback;

}

function getSalleClean(field, fallback = "—") {
    // Utilise getVal pour extraire la salle brute
    const salleBrute = getVal(field, fallback);
    // Cherche tous les codes de salle commençant par J- (ex : J-210)
    const matches = salleBrute.match(/J-\d+/g);
    if (matches && matches.length > 0) return matches[0];
    // Si aucun code J- trouvé, on n'affiche rien
    return '';
}

function afficherPronote(cible = null, modeAuto = false) {
    setClientDisplayPage('pronote');
    if (!cible) {
        entrerModePleinEcran('📅 Emploi du Temps');
        cible = document.getElementById('contenu-plein-ecran');
    }

    cible.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Chargement de l'emploi du temps...</p>
        </div>
    `;

    fetch('/api/pronote')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                cible.innerHTML = `<div class="erreur">Erreur: ${data.message || "Impossible de charger l'emploi du temps"}</div>`;
                return;
            }

            const edt = data.data || {};
            let coursList = Array.isArray(edt.cours) ? edt.cours : [];

            const getHeureDebut = (c) => {
                const h = getVal(c.heure);
                const m = h.match(/(\d{1,2}:\d{2})/);
                return m ? m[1] : "99:99";
            };
            const getHeureFin = (c) => {
                const h = getVal(c.heure);
                const m = h.match(/\d{1,2}:\d{2}\s*-\s*(\d{1,2}:\d{2})/);
                return m ? m[1] : "99:99";
            };

            // Trie les cours par heure de début
            coursList = coursList.slice().sort((a, b) =>
                getHeureDebut(a).localeCompare(getHeureDebut(b))
            );

            // En mode défilement auto, filtre les cours déjà terminés
            if (modeAuto) {
                const now = new Date();
                const heureNow = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                coursList = coursList.filter(c => getHeureFin(c) > heureNow);
            }

            let html = `
                <h2>📅 Emploi du Temps - ${edt.jour || ""} ${edt.date || ""}</h2>
                <div style="margin-top: 20px;">
            `;

            if (coursList.length === 0) {
                html += `<p>Aucun cours prévu aujourd'hui.</p>`;
            } else {
                coursList.forEach(cours => {
                    html += `
                        <div class="pronote-cours">
                            <div class="cours-header">
                                <h3 class="matiere">${getVal(cours.matiere)}</h3>
                                <span class="heure">🕐 ${getVal(cours.heure)}</span>
                            </div>

                            <div class="cours-details">
                                <div class="detail-item">
                                    <span class="label">📍 Salle:</span>
                                    <span class="value">${getSalleClean(cours.salle)}</span>
                                </div>

                                <div class="detail-item">
                                    <span class="label">👨‍🏫 Professeur:</span>
                                    <span class="value">${getVal(cours.professeur)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            html += `</div>`;

            if (edt.message) {
                html += `<div class="erreur" style="background:#fdcb6e;color:#333;margin-top:20px;">${edt.message}</div>`;
            }

            cible.innerHTML = html;
        })
        .catch(error => {
            cible.innerHTML = `<div class="erreur">Erreur lors du chargement: ${error.message}</div>`;
        });
}
