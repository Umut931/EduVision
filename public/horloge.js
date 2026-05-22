// Variables globales pour l'horloge
let intervalId = null;

function mettreAJourHeure() {
    const maintenant = new Date();
    const heures = String(maintenant.getHours()).padStart(2, '0');
    const minutes = String(maintenant.getMinutes()).padStart(2, '0');
    const heure = `${heures}:${minutes}`;
    
    // Mettre à jour le bouton
    const affichageHeure = document.getElementById('heure-affichage');
    if (affichageHeure) {
        affichageHeure.textContent = heure;
    }
    
    // Mettre à jour le contenu si l'horloge est affichée
    const contenuHorloge = document.getElementById('contenu-horloge');
    if (contenuHorloge) {
        contenuHorloge.textContent = heure;
    }
}

function afficherHorloge() {
    entrerModePleinEcran('🕐 Horloge');
    const contenu = document.getElementById('contenu-plein-ecran');
    
    // Arrêter l'intervalle précédent s'il existe
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    contenu.innerHTML = `
        <div class="horloge-fullscreen" style="display: flex; align-items: center; justify-content: center; height: 80vh;">
            <div id="contenu-horloge" class="horloge-heure-large" style="font-size: 18vw; font-weight: bold; color: #fff; text-shadow: 0 4px 32px rgba(10,18,36,0.25); letter-spacing: 0.08em;">
                --:--:--
            </div>
        </div>
    `;
    
    // Mettre à jour immédiatement et puis chaque seconde
    function updateFullHorloge() {
        const maintenant = new Date();
        const heures = String(maintenant.getHours()).padStart(2, '0');
        const minutes = String(maintenant.getMinutes()).padStart(2, '0');
        const secondes = String(maintenant.getSeconds()).padStart(2, '0');
        const heure = `${heures}:${minutes}:${secondes}`;
        document.getElementById('contenu-horloge').textContent = heure;
    }
    updateFullHorloge();
    intervalId = setInterval(updateFullHorloge, 1000);
}

function basculerFormat() {
    const format24h = document.getElementById('format-24h').checked;
    const affichageHeure = document.getElementById('heure-affichage');
    const contenuHorloge = document.getElementById('contenu-horloge');
    
    if (!contenuHorloge) return;
    
    const maintenant = new Date();
    let heure;
    
    if (format24h) {
        const heures = String(maintenant.getHours()).padStart(2, '0');
        const minutes = String(maintenant.getMinutes()).padStart(2, '0');
        const secondes = String(maintenant.getSeconds()).padStart(2, '0');
        heure = `${heures}:${minutes}:${secondes}`;
    } else {
        heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    
    if (affichageHeure) {
        affichageHeure.textContent = heure;
    }
    
    const jour = maintenant.toLocaleDateString('fr-FR', { weekday: 'long' });
    const date = maintenant.toLocaleDateString('fr-FR');
    contenuHorloge.innerHTML = `
        <div class="horloge-heure">${heure}</div>
        <div class="horloge-infos">
            <div>${jour.charAt(0).toUpperCase() + jour.slice(1)}</div>
            <div>${date}</div>
        </div>
    `;
}

function basculerMillisecondes() {
    const afficherMs = document.getElementById('afficher-millisecondes').checked;
    const contenuHorloge = document.getElementById('contenu-horloge');
    
    if (!contenuHorloge) return;
    
    const maintenant = new Date();
    const heures = String(maintenant.getHours()).padStart(2, '0');
    const minutes = String(maintenant.getMinutes()).padStart(2, '0');
    const secondes = String(maintenant.getSeconds()).padStart(2, '0');
    const millisecondes = String(maintenant.getMilliseconds()).padStart(3, '0');
    
    let heure;
    if (afficherMs) {
        heure = `${heures}:${minutes}:${secondes}.${millisecondes}`;
    } else {
        heure = `${heures}:${minutes}:${secondes}`;
    }
    
    const jour = maintenant.toLocaleDateString('fr-FR', { weekday: 'long' });
    const date = maintenant.toLocaleDateString('fr-FR');
    contenuHorloge.innerHTML = `
        <div class="horloge-heure">${heure}</div>
        <div class="horloge-infos">
            <div>${jour.charAt(0).toUpperCase() + jour.slice(1)}</div>
            <div>${date}</div>
        </div>
    `;
}

function afficherTempsEcoule() {
    const contenu = document.getElementById('contenu-plein-ecran');
    const maintenant = new Date();
    const debut = new Date(maintenant.getFullYear(), 0, 1);
    const tempsEcoule = maintenant - debut;
    const joursEcoules = Math.floor(tempsEcoule / (1000 * 60 * 60 * 24));
    
    contenu.innerHTML = `
        <div class="horloge-container">
            <h2>🕐 Horloge Numérique</h2>
            <div id="contenu-horloge" class="horloge-affichage">
                <div class="horloge-heure">--:--:--</div>
                <div class="horloge-infos">
                    <div>--</div>
                    <div>--/--/----</div>
                </div>
            </div>
            
            <div class="horloge-options">
                <h3>⏱️ Temps écoulé depuis le 1er janvier ${maintenant.getFullYear()}</h3>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-valeur">${joursEcoules}</div>
                        <div class="stat-label">Jours écoulés</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-valeur">${Math.floor(tempsEcoule / (1000 * 60 * 60)) % 24}</div>
                        <div class="stat-label">Heures</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-valeur">${Math.floor(tempsEcoule / (1000 * 60)) % 60}</div>
                        <div class="stat-label">Minutes</div>
                    </div>
                </div>
                <button class="btn-action" onclick="afficherHorloge()">⬅️ Retour</button>
            </div>
        </div>
    `;
}

function afficherZonesHoraires() {
    const contenu = document.getElementById('contenu-plein-ecran');
    const maintenant = new Date();
    
    const villes = [
        { nom: 'Paris', fuseau: 'Europe/Paris' },
        { nom: 'Tokyo', fuseau: 'Asia/Tokyo' },
        { nom: 'New York', fuseau: 'America/New_York' },
        { nom: 'Sydney', fuseau: 'Australia/Sydney' },
        { nom: 'Dubai', fuseau: 'Asia/Dubai' },
        { nom: 'Los Angeles', fuseau: 'America/Los_Angeles' }
    ];
    
    let html = `
        <div class="horloge-container">
            <h2>🌍 Zones Horaires Mondiales</h2>
            <div class="zones-horaires">
    `;
    
    villes.forEach(ville => {
        const heure = maintenant.toLocaleTimeString('fr-FR', { 
            timeZone: ville.fuseau,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        html += `
            <div class="zone-horaire-card">
                <div class="zone-ville">${ville.nom}</div>
                <div class="zone-heure">${heure}</div>
            </div>
        `;
    });
    
    html += `
            </div>
            <button class="btn-action" onclick="afficherHorloge()">⬅️ Retour</button>
        </div>
    `;
    
    contenu.innerHTML = html;
}