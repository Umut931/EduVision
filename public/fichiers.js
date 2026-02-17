function afficherFichiers() {
    // Créer un input file caché et le déclencher
    const input = document.createElement('input');
    input.type = 'file';
    // Accepter tous les types de fichiers (vidéos, documents, images, etc.)
    input.accept = 'video/*,image/*,application/pdf,.doc,.docx,.txt,.odt,.xls,.xlsx,.ppt,.pptx';
    input.style.display = 'none';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            afficherFichierPleinEcran(file);
        }
    };
    
    // Déclencher le clic sur l'input file pour ouvrir l'explorateur
    document.body.appendChild(input);
    input.click();
    // Ne pas supprimer immédiatement pour éviter les problèmes avec certains navigateurs
    setTimeout(() => {
        if (input.parentNode) {
            document.body.removeChild(input);
        }
    }, 100);
}

// Variable pour stocker l'URL de l'objet actuel
let currentFileURL = null;

function afficherFichierPleinEcran(file) {
    entrerModePleinEcran(`📄 ${file.name}`);
    
    // Libérer l'URL précédente si elle existe
    if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
    }
    
    const contenu = document.getElementById('contenu-plein-ecran');
    const fileType = file.type;
    const fileName = file.name;
    currentFileURL = URL.createObjectURL(file);
    
    let html = '';
    
    // Vérifier le type de fichier
    if (fileType.startsWith('video/')) {
        // Vidéos - affichage en plein écran
        html = `
            <h2>🎬 ${fileName}</h2>
            <div style="display: flex; justify-content: center; margin-top: 30px; gap: 15px; align-items: flex-start;">
                <video id="fichier-video" style="max-width: 100%; max-height: 70vh; border-radius: 10px;" controls autoplay>
                    <source src="${currentFileURL}" type="${fileType}">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-camera" id="btn-fichier-fullscreen" onclick="basculerPleinEcranFichier()" title="Plein écran">⛶ Plein écran</button>
                    <button class="btn-camera" style="background: #d32f2f;" id="btn-fichier-close" onclick="afficherAccueil()" title="Fermer">✕ Fermer</button>
                </div>
            </div>
        `;
    } else if (fileType.startsWith('image/')) {
        // Images - affichage en plein écran
        html = `
            <h2>🖼️ ${fileName}</h2>
            <div style="display: flex; justify-content: center; align-items: center; margin-top: 30px; height: calc(100vh - 250px); gap: 15px;">
                <img id="fichier-image" src="${currentFileURL}" alt="${fileName}" style="max-width: 100%; max-height: 100%; border-radius: 10px; object-fit: contain;">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-camera" id="btn-fichier-fullscreen" onclick="basculerPleinEcranFichier()" title="Plein écran">⛶ Plein écran</button>
                    <button class="btn-camera" style="background: #d32f2f;" id="btn-fichier-close" onclick="afficherAccueil()" title="Fermer">✕ Fermer</button>
                </div>
            </div>
        `;
    } else if (fileType === 'application/pdf') {
        // PDF - affichage dans un iframe
        html = `
            <h2>📄 ${fileName}</h2>
            <div style="margin-top: 20px; display: flex; gap: 15px;">
                <iframe id="fichier-pdf" src="${currentFileURL}" style="width: 100%; height: 70vh; border-radius: 10px; border: none;"></iframe>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn-camera" id="btn-fichier-fullscreen" onclick="basculerPleinEcranFichier()" title="Plein écran">⛶ Plein écran</button>
                    <button class="btn-camera" style="background: #d32f2f;" id="btn-fichier-close" onclick="afficherAccueil()" title="Fermer">✕ Fermer</button>
                </div>
            </div>
        `;
    } else if (fileType.startsWith('text/')) {
        // Fichiers texte - lecture du contenu
        const reader = new FileReader();
        reader.onload = function(e) {
            const textContent = e.target.result;
            const contenuPleinEcran = document.getElementById('contenu-plein-ecran');
            if (contenuPleinEcran) {
                contenuPleinEcran.innerHTML = `
                    <h2>📝 ${fileName}</h2>
                    <div style="display: flex; gap: 15px;">
                        <pre id="fichier-text" style="background: #f5f5f5; padding: 20px; border-radius: 10px; overflow-auto; max-height: 70vh; font-family: 'Courier New', monospace; white-space: pre-wrap; word-wrap: break-word; flex: 1;">${escapeHtml(textContent)}</pre>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button class="btn-camera" id="btn-fichier-fullscreen" onclick="basculerPleinEcranFichier()" title="Plein écran" style="height: fit-content;">⛶ Plein écran</button>
                            <button class="btn-camera" style="background: #d32f2f; height: fit-content;" id="btn-fichier-close" onclick="afficherAccueil()" title="Fermer">✕ Fermer</button>
                        </div>
                    </div>
                `;
            }
        };
        reader.readAsText(file);
        html = `<h2>📝 ${fileName}</h2><p style="margin-top: 20px; text-align: center; color: #666;">Chargement du fichier...</p>`;
    } else if (fileType.includes('word') || fileType.includes('document') || 
               fileType.includes('spreadsheet') || fileType.includes('presentation') ||
               fileType.includes('excel') || fileType.includes('powerpoint')) {
        // Documents Office
        html = `
            <h2>📊 ${fileName}</h2>
            <div style="text-align: center; padding: 40px; background: #f5f5f5; border-radius: 10px; margin-top: 30px;">
                <p style="font-size: 1.2em; color: #666; margin-bottom: 20px;">Ce type de document ne peut pas être affiché directement.</p>
                <a href="${currentFileURL}" download="${fileName}" style="display: inline-block; padding: 15px 30px; background: #667eea; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; cursor: pointer;">
                    📥 Télécharger le document
                </a>
            </div>
        `;
    } else {
        // Autres types de fichiers
        html = `
            <h2>📦 ${fileName}</h2>
            <div style="text-align: center; padding: 40px; background: #f5f5f5; border-radius: 10px; margin-top: 30px;">
                <p style="font-size: 1.1em; color: #666; margin-bottom: 10px;">Type : ${fileType || 'Inconnu'}</p>
                <p style="color: #999; margin-bottom: 20px;">Ce fichier ne peut pas être prévisualisé.</p>
                <a href="${currentFileURL}" download="${fileName}" style="display: inline-block; padding: 15px 30px; background: #667eea; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; cursor: pointer;">
                    📥 Télécharger le fichier
                </a>
            </div>
        `;
    }
    
    contenu.innerHTML = html;
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function fermerPleinEcran() {
    const contenu = document.getElementById('contenu');
    const boutonsContainer = document.querySelector('.boutons-container');
    const h1 = document.querySelector('h1');
    const container = document.querySelector('.container');
    
    // Libérer l'URL de l'objet pour libérer la mémoire
    if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
        currentFileURL = null;
    }
    
    // Réafficher les éléments
    if (boutonsContainer) boutonsContainer.style.display = 'grid';
    if (h1) h1.style.display = 'block';
    if (container) {
        container.style.maxWidth = '1200px';
        container.style.padding = '20px';
    }
    
    // Retirer le mode plein écran
    contenu.classList.remove('plein-ecran');
    contenu.classList.remove('active');
    contenu.innerHTML = '';
}

// Plein écran fichier
let fichierFullscreen = false;

function basculerPleinEcranFichier() {
    const video = document.getElementById('fichier-video');
    const image = document.getElementById('fichier-image');
    const pdf = document.getElementById('fichier-pdf');
    const text = document.getElementById('fichier-text');
    const container = document.getElementById('container-plein-ecran');
    const header = document.getElementById('plein-ecran-header');
    const btn = document.getElementById('btn-fichier-fullscreen');
    
    if (!video && !image && !pdf && !text) return;
    
    fichierFullscreen = !fichierFullscreen;
    
    if (fichierFullscreen) {
        // Entrer en plein écran
        if (video) video.classList.add('fichier-fullscreen');
        if (image) image.classList.add('fichier-fullscreen');
        if (pdf) pdf.classList.add('fichier-fullscreen');
        if (text) text.classList.add('fichier-fullscreen');
        container.classList.add('fichier-fullscreen-mode');
        header.classList.add('header-hidden');
        btn.textContent = '⛶ Normal';
        btn.style.background = '#d32f2f';
    } else {
        // Quitter le plein écran
        if (video) video.classList.remove('fichier-fullscreen');
        if (image) image.classList.remove('fichier-fullscreen');
        if (pdf) pdf.classList.remove('fichier-fullscreen');
        if (text) text.classList.remove('fichier-fullscreen');
        container.classList.remove('fichier-fullscreen-mode');
        header.classList.remove('header-hidden');
        btn.textContent = '⛶ Plein écran';
        btn.style.background = '';
    }
}
