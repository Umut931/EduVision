function afficherPronote() {
    entrerModePleinEcran('📅 Emploi du Temps');
    const contenu = document.getElementById('contenu-plein-ecran');
    contenu.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement de l\'emploi du temps...</p></div>';
    
    fetch('/api/pronote')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const edt = data.data;
                let html = `
                    <h2>📅 Emploi du Temps - ${edt.jour} ${edt.date}</h2>
                    <div style="margin-top: 20px;">
                `;
                
                if (edt.cours && edt.cours.length > 0) {
                    edt.cours.forEach(cours => {
                        html += `
                            <div class="pronote-cours">
                                <div class="cours-header">
                                    <h3 class="matiere">${cours.matiere}</h3>
                                    <span class="heure">🕐 ${cours.heure}</span>
                                </div>
                                <div class="cours-details">
                                    <div class="detail-item">
                                        <span class="label">📍 Salle:</span>
                                        <span class="value">${cours.salle}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="label">👨‍🏫 Professeur:</span>
                                        <span class="value">${cours.professeur}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html += '<p>Aucun cours prévu aujourd\'hui.</p>';
                }
                
                html += '</div>';
                if (edt.message) {
                    html += `<div class="erreur" style="background: #fdcb6e; color: #333; margin-top: 20px;">${edt.message}</div>`;
                }
                
                contenu.innerHTML = html;
            } else {
                contenu.innerHTML = `<div class="erreur">Erreur: ${data.message || 'Impossible de charger l\'emploi du temps'}</div>`;
            }
        })
        .catch(error => {
            contenu.innerHTML = `<div class="erreur">Erreur lors du chargement: ${error.message}</div>`;
        });
}
