// Variables et fonctions communes
let contenuActif = null;
let modePleinEcran = false;
let modeFocus = false;

function changerContenu(type) {
    const contenu = document.getElementById('contenu');
    contenu.classList.add('active');
    contenuActif = type;
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

function afficherPronote() {
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
                contenu.innerHTML = `<div class="erreur">${data.message}</div>`;
                return;
            }

            const edt = data.data;

            let html = `
                <h2>📅 Emploi du Temps - ${edt.jour} ${edt.date}</h2>
            `;

            if (edt.cours.length === 0) {
                html += `<p>Aucun cours aujourd'hui.</p>`;
            } else {
                edt.cours.forEach(cours => {
                    html += `
                        <div class="pronote-cours">
                            <h4>${cours.matiere}</h4>
                            <p><strong>Heure :</strong> ${cours.heure}</p>
                            <p><strong>Salle :</strong> ${cours.salle}</p>
                            <p><strong>Professeur :</strong> ${cours.professeur}</p>
                        </div>
                    `;
                });
            }

            contenu.innerHTML = html;
        })
        .catch(err => {
            contenu.innerHTML = `<div class="erreur">Erreur : ${err.message}</div>`;
        });
}
