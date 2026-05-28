function afficherFichiers() {
    entrerModePleinEcran('📁 Gestion des fichiers');
    
    const contenu = document.getElementById('contenu-plein-ecran');
    contenu.innerHTML = `
        <div style="padding: 20px;">
            <h2>📁 Fichiers disponibles</h2>
            
            <div style="margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div id="upload-area" style="border: 2px dashed #ccc; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9; grid-column: 1 / 2;">
                    <p style="margin: 0; color: #666; font-size: 0.9em;">📤 Glissez des fichiers ici</p>
                    <button id="select-files-btn" class="btn-camera" style="margin-top: 10px; font-size: 0.9em;">Parcourir</button>
                </div>
                
                <div id="sync-area" style="border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; background: #f0f8ff;">
                    <p style="margin: 0; color: #667eea; font-weight: bold;">🔄 Synchronisation</p>
                    <button id="sync-btn" class="btn-camera" style="margin-top: 10px; background: #667eea; color: white; font-size: 0.9em;">Synchroniser Raspberry</button>
                    <button id="reload-clients-btn" class="btn-camera" style="margin-top: 8px; background: #e67e22; color: white; font-size: 0.9em;" title="Force les écrans clients à recharger la page">↺ Recharger les écrans</button>
                </div>
                
                <div id="status-area" style="border: 2px solid #666; border-radius: 10px; padding: 20px; text-align: center; background: #1a1a1a;">
                    <p style="margin: 0; color: #999; font-size: 0.85em;">📊 Status</p>
                    <p id="status-text" style="margin: 5px 0 0 0; color: #ccc; font-size: 0.9em;">En attente...</p>
                </div>
            </div>
            
            <div id="selection-section" style="margin-bottom: 20px;">
                <h3>📌 Sélection actuelle (ordre)</h3>
                <div id="selection-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px;">
                    <p style="grid-column: 1 / -1; text-align: center; color: #666;">Chargement de la sélection...</p>
                </div>
            </div>

            <div id="pdf-control-section" style="margin-bottom: 20px; border: 2px solid #28a745; border-radius: 10px; padding: 20px; background: #f8fff8;">
                <h3>📄 Contrôle PDF synchronisé</h3>
                <div id="pdf-status" style="margin-bottom: 15px; padding: 10px; background: #e8f5e8; border-radius: 5px; text-align: center;">
                    Aucun PDF actif
                </div>
                
                <!-- Mini-écran d'aperçu du PDF -->
                <div id="pdf-preview-container" style="margin-bottom: 15px; border: 2px solid #28a745; border-radius: 8px; background: white; display: flex; flex-direction: column; align-items: center;">
                    <div id="pdf-preview" style="width: 100%; height: 400px; background: #f5f5f5; overflow: auto; border-radius: 6px; position: relative; display: flex; align-items: center; justify-content: center;">
                        <p style="color: #999; text-align: center;">Aucun PDF sélectionné</p>
                    </div>
                    
                    <!-- Contrôles de zoom et scroll -->
                    <div style="width: 100%; display: flex; justify-content: center; gap: 10px; padding: 12px; background: #f0f0f0; border-radius: 0 0 6px 6px;">
                        <button class="btn-camera" style="background: #667eea;" onclick="pdfZoomOut()" id="pdf-zoom-out-btn" disabled>🔍− Dézoom</button>
                        <span id="pdf-zoom-level" style="font-weight: bold; min-width: 80px; text-align: center;">100%</span>
                        <button class="btn-camera" style="background: #667eea;" onclick="pdfZoomIn()" id="pdf-zoom-in-btn" disabled>Zoom 🔍+</button>
                        <button class="btn-camera" style="background: #6c757d;" onclick="pdfResetZoom()" id="pdf-reset-zoom-btn" disabled>↺ Réinitialiser</button>
                    </div>
                </div>
                
                <!-- Contrôles de navigation des pages -->
                <div style="display: flex; justify-content: center; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button id="pdf-prev-btn" class="btn-camera" style="background: #6c757d;" onclick="pdfPrevPage()" disabled>⬅️ Précédent</button>
                    <span id="pdf-page-info" style="font-weight: bold; min-width: 120px; text-align: center;">Page --/--</span>
                    <button id="pdf-next-btn" class="btn-camera" style="background: #6c757d;" onclick="pdfNextPage()" disabled>Suivant ➡️</button>
                    <button id="pdf-stop-btn" class="btn-camera" style="background: #dc3545;" onclick="pdfStopSync()">⏹️ Arrêter</button>
                    <button id="pdf-clear-annotations-btn" class="btn-camera" style="background: #ff9800;" onclick="clearPdfAnnotations()" title="Effacer les annotations">🗑️ Effacer dessin</button>
                </div>
            </div>

            <div id="files-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                <p style="grid-column: 1 / -1; text-align: center; color: #666;">Chargement des fichiers...</p>
            </div>
        </div>
    `;
    
    // Charger la liste des fichiers et la sélection
    chargerListeFichiers();
    chargerSelection();
    chargerStatus();
    initPdfAutoRefresh();  // Initialiser l'actualisation automatique du PDF
    
    // Configurer le drag-and-drop
    configurerDragAndDrop();
    
    // Bouton de sélection de fichiers
    document.getElementById('select-files-btn').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*,image/*,application/pdf,.doc,.docx,.txt,.odt,.xls,.xlsx,.ppt,.pptx';
        input.onchange = (event) => uploaderFichiers(event.target.files);
        input.click();
    };
    
    // Bouton rechargement forcé des clients
    document.getElementById('reload-clients-btn').onclick = () => {
        if (typeof adminSocket !== 'undefined' && adminSocket) {
            adminSocket.emit('admin-reload-clients');
            alert('↺ Demande de rechargement envoyée aux écrans clients');
        } else {
            alert('❌ Socket admin non connecté');
        }
    };

    // Bouton de synchronisation
    document.getElementById('sync-btn').onclick = async () => {
        const syncBtn = document.getElementById('sync-btn');
        syncBtn.disabled = true;
        syncBtn.textContent = 'Synchronisation...';
        
        try {
            const response = await fetch('/api/sync', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                alert(`✅ Synchronisation réussie!\n${data.medias.length} fichier(s) envoyé(s) à la Raspberry Pi`);
                chargerStatus();
            } else {
                alert('❌ Erreur de synchronisation');
            }
        } catch (error) {
            alert('❌ Erreur: ' + error.message);
        } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = 'Synchroniser Raspberry';
        }
    };
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

// Fonction pour charger la liste des fichiers depuis le serveur
async function chargerListeFichiers() {
    try {
        const response = await fetch('/api/fichiers');
        const data = await response.json();
        
        if (data.success) {
            afficherListeFichiers(data.fichiers);
        } else {
            document.getElementById('files-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #d32f2f;">Erreur lors du chargement des fichiers</p>';
        }
    } catch (error) {
        console.error('Erreur chargement fichiers:', error);
        document.getElementById('files-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #d32f2f;">Erreur de connexion</p>';
    }
}

// Fonction pour afficher la liste des fichiers
function afficherListeFichiers(fichiers) {
    const filesList = document.getElementById('files-list');
    
    if (fichiers.length === 0) {
        filesList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Aucun fichier disponible</p>';
        return;
    }
    
    filesList.innerHTML = fichiers.map(fichier => {
        const isPdf = fichier.type === 'application/pdf';
        const extraButton = isPdf ? `<button class="btn-camera pdf-sync-btn" style="background: #28a745;" title="Démarrer synchronisation PDF" data-filename="${escapeHtml(fichier.nom)}">📄🔄</button>` : '';
        
        return `
        <div class="file-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 2em;">${getFileIcon(fichier.type)}</div>
            <div style="text-align: center;">
                <div style="font-weight: bold; word-break: break-word;">${fichier.nom}</div>
                <div style="font-size: 0.8em; color: #666;">${formatTaille(fichier.taille)}</div>
            </div>
            <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;">
                <button class="btn-camera" onclick="visualiserFichier('${fichier.nom}')" title="Visualiser">👁️</button>
                <button class="btn-camera" onclick="ajouterSelection('${fichier.nom}')" title="Ajouter à la sélection">➕</button>
                ${extraButton}
                <button class="btn-camera" style="background: #d32f2f;" onclick="supprimerFichier('${fichier.nom}')" title="Supprimer">🗑️</button>
            </div>
        </div>
        `;
    }).join('');
    
    // Ajouter les event listeners pour les boutons PDF
    document.querySelectorAll('.pdf-sync-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fileName = this.getAttribute('data-filename');
            console.log('🖱️ Clic bouton PDF sync:', fileName);
            pdfStartSync(fileName);
        });
    });
}

// Fonction pour afficher la sélection actuelle
function afficherSelection(medias) {
    const selectionList = document.getElementById('selection-list');
    if (!selectionList) return;
    
    if (medias.length === 0) {
        selectionList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666;">Aucune sélection active</p>';
        return;
    }
    
    selectionList.innerHTML = medias.map((media, index) => `
        <div class="selection-card" style="border: 1px solid #4677f2; border-radius: 8px; padding: 12px; background: #f0f6ff; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: bold; word-break: break-word;">${index + 1}. ${media.nom}</div>
            <div style="display: flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap;">
                <span style="font-size: 0.85em;">Durée (sec) :</span>
                <input id="duration-${media.nom}" type="number" min="1" value="${media.duration || 10}" style="width: 70px; padding: 3px; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn-camera" onclick="changerDuree('${media.nom}')">⏱</button>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
                <button class="btn-camera" onclick="deplacerSelection('${media.nom}', 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn-camera" onclick="deplacerSelection('${media.nom}', 'down')" ${index === medias.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn-camera" onclick="retirerSelection('${media.nom}')" style="background: #d32f2f;">✕</button>
                <button class="btn-camera" onclick="afficherMaintenant('${media.nom}')" style="background: #00796b;">▶</button>
            </div>
        </div>
    `).join('');
}

async function chargerSelection() {
    try {
        const response = await fetch('/api/medias');
        const data = await response.json();
        if (data.success) {
            afficherSelection(data.medias);
        }
    } catch (error) {
        console.error('Erreur chargement sélection:', error);
    }
}

async function deplacerSelection(nomFichier, direction) {
    try {
        const response = await fetch('/api/medias');
        const data = await response.json();
        if (!data.success) throw new Error('Impossible de récupérer la sélection');
        
        const medias = data.medias.map(m => m.nom);
        const i = medias.indexOf(nomFichier);
        if (i === -1) return;
        if (direction === 'up' && i > 0) {
            [medias[i - 1], medias[i]] = [medias[i], medias[i - 1]];
        } else if (direction === 'down' && i < medias.length - 1) {
            [medias[i + 1], medias[i]] = [medias[i], medias[i + 1]];
        } else {
            return;
        }
        
        await fetch('/api/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fichiers: medias })
        });

        chargerSelection();
        logEvent('INFO', `Sélection reorder: ${nomFichier} ${direction}`);
    } catch (error) {
        console.error('Erreur déplacer sélection:', error);
    }
}

async function changerDuree(nomFichier) {
    try {
        const input = document.getElementById(`duration-${nomFichier}`);
        if (!input) return;

        const nouvelleDuree = Number(input.value);
        if (!nouvelleDuree || nouvelleDuree <= 0) {
            alert('Indiquez une durée valide (>= 1 sec)');
            return;
        }

        const response = await fetch('/api/medias');
        const data = await response.json();
        if (!data.success) throw new Error('Impossible de récupérer la sélection');

        const medias = data.medias.map(m => {
            if (m.nom === nomFichier) {
                return { nom: m.nom, duration: nouvelleDuree };
            }
            return { nom: m.nom, duration: m.duration || 10 };
        });

        const selectionResponse = await fetch('/api/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fichiers: medias })
        });

        const selectionData = await selectionResponse.json();
        if (!selectionData.success) throw new Error('Impossible de mettre à jour la sélection');

        chargerSelection();
        alert(`Durée de ${nomFichier} mise à jour à ${nouvelleDuree} sec`);
    } catch (error) {
        console.error('Erreur changer durée:', error);
        alert('Erreur lors de la mise à jour de durée');
    }
}

async function retirerSelection(nomFichier) {
    try {
        const response = await fetch('/api/medias');
        const data = await response.json();
        if (!data.success) throw new Error('Impossible de récupérer la sélection');

        const medias = data.medias.map(m => m.nom).filter(n => n !== nomFichier);
        await fetch('/api/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fichiers: medias })
        });

        chargerSelection();
    } catch (error) {
        console.error('Erreur retirer sélection:', error);
    }
}

async function afficherMaintenant(nomFichier) {
    try {
        await fetch('/api/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fichiers: [nomFichier] })
        });
        chargerSelection();
        alert(`Affichage immédiat : ${nomFichier}`);
    } catch (error) {
        console.error('Erreur affichage immédiat:', error);
    }
}

// Fonction pour configurer le drag-and-drop
function configurerDragAndDrop() {
    const uploadArea = document.getElementById('upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.background = '#f0f8ff';
    }
    
    function unhighlight(e) {
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.background = '#f9f9f9';
    }
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        uploaderFichiers(files);
    }
}

// ==================== INITIALISATION ====================

// Variable pour l'intervalle de rafraîchissement PDF
let pdfRefreshInterval = null;

// Initialiser l'auto-actualisation du statut PDF (appelée depuis afficherFichiers)
function initPdfAutoRefresh() {
    // Nettoyer l'intervalle précédent s'il existe
    if (pdfRefreshInterval) {
        clearInterval(pdfRefreshInterval);
    }
    
    // Charger une première fois
    chargerPdfStatus();
    
    // Puis actualiser toutes les 5 secondes
    pdfRefreshInterval = setInterval(() => {
        chargerPdfStatus();
    }, 5000);
}

// ==================== FONCTIONS PDF SYNCHRONISÉ ====================

// Variables de zoom PDF
let pdfZoomLevel = 100;
let pdfScrollPosition = 0;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

// Variables de suivi PDF (fichier et page en cours)
let currentPdfPage = 1;
let currentPdfFile = null;

// Charger le statut PDF actuel
async function chargerPdfStatus() {
    try {
        const response = await fetch('/api/pdf/status');
        const data = await response.json();
        
        console.log('📊 Statut PDF reçu:', data);
        
        const statusDiv = document.getElementById('pdf-status');
        const pageInfo = document.getElementById('pdf-page-info');
        const prevBtn = document.getElementById('pdf-prev-btn');
        const nextBtn = document.getElementById('pdf-next-btn');
        const zoomInBtn = document.getElementById('pdf-zoom-in-btn');
        const zoomOutBtn = document.getElementById('pdf-zoom-out-btn');
        const resetZoomBtn = document.getElementById('pdf-reset-zoom-btn');
        
        // Vérifier que tous les éléments existent (au cas où la fonction soit appelée avant que le HTML soit créé)
        if (!statusDiv || !pageInfo || !prevBtn || !nextBtn) {
            console.log('Éléments PDF non trouvés dans le DOM');
            return;
        }
        
        if (data.success && data.file) {
            statusDiv.innerHTML = `📄 <strong>${data.file}</strong> - PDF synchronisé actif`;
            statusDiv.style.background = '#d4edda';
            statusDiv.style.color = '#155724';
            
            pageInfo.textContent = `Page ${data.page}/${data.totalPages}`;

            // Comparer AVANT de mettre à jour (sinon la comparaison est toujours false)
            const fileChanged = currentPdfFile !== data.file || currentPdfPage !== data.page;

            // Mettre à jour le suivi local du fichier et de la page
            currentPdfFile = data.file;
            currentPdfPage = data.page;

            prevBtn.disabled = data.page <= 1;
            nextBtn.disabled = data.page >= data.totalPages;
            zoomInBtn.disabled = false;
            zoomOutBtn.disabled = false;
            resetZoomBtn.disabled = false;

            if (fileChanged) {
                pdfAnnotations = [];
                await chargerAperçuPdf(data.file, data.page, pdfZoomLevel);
            }
        } else {
            statusDiv.innerHTML = 'Aucun PDF actif';
            statusDiv.style.background = '#f8f9fa';
            statusDiv.style.color = '#6c757d';
            
            pageInfo.textContent = 'Page --/--';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            zoomInBtn.disabled = true;
            zoomOutBtn.disabled = true;
            resetZoomBtn.disabled = true;
            
            // Nettoyer les annotations quand on arrête le PDF
            pdfAnnotations = [];
            
            // Effacer l'aperçu
            const previewDiv = document.getElementById('pdf-preview');
            if (previewDiv) {
                previewDiv.innerHTML = '<p style="color: #999; text-align: center;">Aucun PDF sélectionné</p>';
            }
        }
    } catch (error) {
        console.error('Erreur chargement statut PDF:', error);
    }
}

// Charger et afficher l'aperçu du PDF
// ==================== VARIABLES PDF ANNOTATIONS ====================

// Store for PDF annotations (strokes) — points stockés en coordonnées normalisées [0-1]
let pdfAnnotations = [];
let isDrawingOnPdf = false;
let pdfDrawingCanvas = null;
let pdfDrawingCtx = null;
let lastX = 0;
let lastY = 0;
let lastDrawPointTime = 0; // throttle mousemove → WebSocket
const STROKE_COLOR = '#FF0000';
const STROKE_WIDTH = 3;
const DRAW_THROTTLE_MS = 16; // ~60fps max pour pdf-draw-point

// ==================== FONCTIONS PDF DRAWINGS ====================

async function chargerAperçuPdf(fileName, pageNumber, zoom) {
    try {
        const previewDiv = document.getElementById('pdf-preview');
        if (!previewDiv) {
            console.log('Élément PDF preview non trouvé');
            return;
        }
        
        // Créer une iframe pour afficher le PDF avec vue.js parameter
        const pdfUrl = `/fichiers/${encodeURIComponent(fileName)}#page=${pageNumber}&zoom=${zoom}`;
        
        previewDiv.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%;">
                <iframe 
                    id="pdf-viewer-iframe"
                    src="${pdfUrl}" 
                    style="
                        width: 100%; 
                        height: 100%; 
                        border: none; 
                        border-radius: 6px;
                        display: block;
                    "
                    allow="fullscreen">
                </iframe>
                <!-- Canvas overlay pour les annotations -->
                <canvas
                    id="pdf-drawing-canvas"
                    style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10;
                        cursor: crosshair;
                        border-radius: 6px;
                        background: rgba(255,255,255,0);
                    ">
                </canvas>
            </div>
        `;
        
        // Initialiser le canvas de dessin
        await initPdfDrawingCanvas();
        
    } catch (error) {
        console.error('Erreur chargement aperçu PDF:', error);
        const previewDiv = document.getElementById('pdf-preview');
        if (previewDiv) {
            previewDiv.innerHTML = '<p style="color: #d32f2f; text-align: center;">Erreur lors du chargement du PDF</p>';
        }
    }
}

// Initialiser le canvas de dessin
async function initPdfDrawingCanvas() {
    const previewDiv = document.getElementById('pdf-preview');
    const canvas = document.getElementById('pdf-drawing-canvas');
    
    if (!canvas || !previewDiv) return;
    
    // Définir la taille du canvas
    canvas.width = previewDiv.clientWidth;
    canvas.height = previewDiv.clientHeight;
    
    pdfDrawingCanvas = canvas;
    pdfDrawingCtx = canvas.getContext('2d');
    
    // Redessiner les annotations précédentes
    redrawPdfAnnotations();
    
    // Event listeners pour le dessin
    canvas.addEventListener('mousedown', startPdfDrawing);
    canvas.addEventListener('mousemove', drawOnPdf);
    canvas.addEventListener('mouseup', stopPdfDrawing);
    canvas.addEventListener('mouseout', stopPdfDrawing);
    
    console.log('✅ Canvas de dessin PDF initialisé', canvas.width, 'x', canvas.height);
}

// Démarrer le dessin
function startPdfDrawing(e) {
    isDrawingOnPdf = true;
    lastDrawPointTime = 0; // Réinitialiser le throttle pour ce nouveau trait
    const rect = pdfDrawingCanvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;

    // Stocker en coordonnées normalisées [0-1] pour redraw correct après zoom
    const normX = rect.width  > 0 ? lastX / rect.width  : 0;
    const normY = rect.height > 0 ? lastY / rect.height : 0;

    pdfAnnotations.push({
        type: 'stroke',
        points: [{ x: normX, y: normY }],
        color: STROKE_COLOR,
        width: STROKE_WIDTH
    });

    if (typeof adminSocket !== 'undefined' && adminSocket) {
        console.log('🖊️ Début trait →', normX.toFixed(3), normY.toFixed(3), '| file:', currentPdfFile, 'page:', currentPdfPage);
        adminSocket.emit('pdf-draw-start', {
            x: normX,
            y: normY,
            color: STROKE_COLOR,
            width: STROKE_WIDTH,
            file: currentPdfFile,
            page: currentPdfPage
        });
    } else {
        console.warn('⚠️ adminSocket non disponible, trait non envoyé');
    }
}

// Dessiner sur le PDF
function drawOnPdf(e) {
    if (!isDrawingOnPdf || !pdfDrawingCtx) return;

    const rect = pdfDrawingCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const normX = rect.width  > 0 ? currentX / rect.width  : 0;
    const normY = rect.height > 0 ? currentY / rect.height : 0;

    if (pdfAnnotations.length > 0) {
        // Stocker en normalisé pour redraw correct sur zoom
        pdfAnnotations[pdfAnnotations.length - 1].points.push({ x: normX, y: normY });
    }

    redrawPdfAnnotations();

    // Throttle à ~60fps pour éviter de flood le WebSocket
    const now = Date.now();
    if (typeof adminSocket !== 'undefined' && adminSocket && rect.width > 0
        && (now - lastDrawPointTime) >= DRAW_THROTTLE_MS) {
        lastDrawPointTime = now;
        adminSocket.emit('pdf-draw-point', { x: normX, y: normY });
    }
}

// Arrêter le dessin
function stopPdfDrawing() {
    if (!isDrawingOnPdf) return;
    isDrawingOnPdf = false;

    if (typeof adminSocket !== 'undefined' && adminSocket) {
        adminSocket.emit('pdf-draw-end', { file: currentPdfFile, page: currentPdfPage });
        console.log('✅ Trait envoyé aux clients (file:', currentPdfFile, 'page:', currentPdfPage, ')');
    }
}

// Redessiner les annotations (points en coordonnées normalisées [0-1])
function redrawPdfAnnotations() {
    if (!pdfDrawingCtx || !pdfDrawingCanvas) return;

    const cw = pdfDrawingCanvas.width;
    const ch = pdfDrawingCanvas.height;

    pdfDrawingCtx.clearRect(0, 0, cw, ch);

    pdfAnnotations.forEach(annotation => {
        if (annotation.type === 'stroke' && annotation.points.length > 1) {
            pdfDrawingCtx.strokeStyle = annotation.color;
            pdfDrawingCtx.lineWidth = annotation.width;
            pdfDrawingCtx.lineCap = 'round';
            pdfDrawingCtx.lineJoin = 'round';

            pdfDrawingCtx.beginPath();
            // Dénormaliser : point normalisé × dimensions canvas courantes
            pdfDrawingCtx.moveTo(annotation.points[0].x * cw, annotation.points[0].y * ch);

            for (let i = 1; i < annotation.points.length; i++) {
                pdfDrawingCtx.lineTo(annotation.points[i].x * cw, annotation.points[i].y * ch);
            }

            pdfDrawingCtx.stroke();
        }
    });
}

// Effacer les annotations
function clearPdfAnnotations() {
    pdfAnnotations = [];
    if (pdfDrawingCtx && pdfDrawingCanvas) {
        pdfDrawingCtx.clearRect(0, 0, pdfDrawingCanvas.width, pdfDrawingCanvas.height);
    }
    
    // Notifier les clients
    if (typeof adminSocket !== 'undefined' && adminSocket) {
        adminSocket.emit('pdf-clear-annotations', {
            page: currentPdfPage,
            file: currentPdfFile
        });
    }
    
    console.log('✳️ Annotations effacées');
}

// ==================== FIN PDF ANNOTATIONS ====================

// Démarrer la synchronisation PDF
async function pdfStartSync(fileName) {
    console.log('🔄 Démarrage synchronisation PDF:', fileName);
    console.log('📦 Type du fileName:', typeof fileName);
    console.log('📦 Valeur du fileName:', JSON.stringify(fileName));
    
    if (!fileName || fileName.trim() === '') {
        console.error('❌ Nom du fichier vide!');
        alert('❌ Erreur: nom du fichier vide');
        return;
    }
    
    try {
        const payload = { file: fileName, page: 1 };
        console.log('📤 Envoi de la requête avec payload:', JSON.stringify(payload));
        
        const response = await fetch('/api/pdf/page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log('📡 Réponse API:', response.status, response.statusText);
        const data = await response.json();
        console.log('📄 Données reçues:', data);
        
        if (data.success) {
            pdfZoomLevel = 100;
            console.log('✅ PDF synchronisé avec succès!');
            chargerPdfStatus();
            alert(`✅ PDF synchronisé : ${fileName}\nLes clients voient maintenant la page 1`);
        } else {
            console.log('❌ Erreur API:', data.message);
            alert('❌ Erreur lors du démarrage de la synchronisation PDF: ' + (data.message || 'Unknown'));
        }
    } catch (error) {
        console.error('❌ Erreur démarrage sync PDF:', error);
        alert('❌ Erreur de connexion');
    }
}

// Zoomer
function pdfZoomIn() {
    if (pdfZoomLevel < MAX_ZOOM) {
        pdfZoomLevel += ZOOM_STEP;
        updatePdfZoom();
    }
}

// Dézoom
function pdfZoomOut() {
    if (pdfZoomLevel > MIN_ZOOM) {
        pdfZoomLevel -= ZOOM_STEP;
        updatePdfZoom();
    }
}

// Réinitialiser le zoom
function pdfResetZoom() {
    pdfZoomLevel = 100;
    updatePdfZoom();
}

// Mettre à jour le zoom et l'affichage
async function updatePdfZoom() {
    const zoomLevel = document.getElementById('pdf-zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = `${pdfZoomLevel}%`;
    }
    
    // Envoyer le changement de zoom au serveur via Socket.IO
    if (typeof adminSocket !== 'undefined' && adminSocket) {
        adminSocket.emit('pdf-zoom-change', { zoom: pdfZoomLevel });
    }
    
    // Mettre à jour l'iframe avec le nouveau zoom
    try {
        const response = await fetch('/api/pdf/status');
        const data = await response.json();
        
        if (data.success && data.file) {
            await chargerAperçuPdf(data.file, data.page, pdfZoomLevel);
        }
    } catch (error) {
        console.error('Erreur mise à jour zoom:', error);
    }
}

// Changer de page PDF
async function pdfChangePage(page) {
    try {
        const response = await fetch('/api/pdf/page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: page })
        });
        
        const data = await response.json();
        if (data.success) {
            chargerPdfStatus();
        } else {
            alert('❌ Page invalide');
        }
    } catch (error) {
        console.error('Erreur changement page PDF:', error);
    }
}

// Page précédente
function pdfPrevPage() {
    fetch('/api/pdf/prev', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                chargerPdfStatus();
            } else {
                alert('❌ Impossible d\'aller à la page précédente');
            }
        })
        .catch(error => {
            console.error('Erreur page précédente:', error);
        });
}

// Page suivante
function pdfNextPage() {
    fetch('/api/pdf/next', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                chargerPdfStatus();
            } else {
                alert('❌ Impossible d\'aller à la page suivante');
            }
        })
        .catch(error => {
            console.error('Erreur page suivante:', error);
        });
}

// Arrêter la synchronisation PDF
async function pdfStopSync() {
    try {
        const statusDiv = document.getElementById('pdf-status');
        const pageInfo = document.getElementById('pdf-page-info');
        const prevBtn = document.getElementById('pdf-prev-btn');
        const nextBtn = document.getElementById('pdf-next-btn');
        const zoomInBtn = document.getElementById('pdf-zoom-in-btn');
        const zoomOutBtn = document.getElementById('pdf-zoom-out-btn');
        const resetZoomBtn = document.getElementById('pdf-reset-zoom-btn');
        const previewDiv = document.getElementById('pdf-preview');
        
        // Vérifier l'existence avant d'accéder
        if (statusDiv) {
            statusDiv.innerHTML = 'Synchronisation arrêtée';
            statusDiv.style.background = '#fff3cd';
            statusDiv.style.color = '#856404';
        }
        
        if (pageInfo) pageInfo.textContent = 'Page --/--';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (zoomInBtn) zoomInBtn.disabled = true;
        if (zoomOutBtn) zoomOutBtn.disabled = true;
        if (resetZoomBtn) resetZoomBtn.disabled = true;
        
        if (previewDiv) {
            previewDiv.innerHTML = '<p style="color: #999; text-align: center;">PDF arrêté</p>';
        }
        
        alert('⏹️ Synchronisation PDF arrêtée\nLes clients retournent à la rotation normale des médias');
    } catch (error) {
        console.error('Erreur arrêt sync PDF:', error);
    }
}

// Fonction pour uploader des fichiers
async function uploaderFichiers(files) {
    const formData = new FormData();
    let totalSize = 0;
    let originalUploadContent = null;
    
    for (let file of files) {
        formData.append('files', file);
        totalSize += file.size;
    }
    
    // Afficher un message de progression
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        originalUploadContent = uploadArea.innerHTML;
        uploadArea.innerHTML = '<p style="margin: 0; color: #667eea;">⏳ Upload en cours... ' + 
                               Math.round(totalSize / 1024 / 1024 * 100) / 100 + ' MB</p>';
    }
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            logEvent('SUCCESS', 'Upload success', { 
                files: data.fichiers.length, 
                totalSize: totalSize,
                selection: data.selection.length 
            });
            
            // Message de succès avec synchronisation auto
            alert(`✅ ${data.fichiers.length} fichier(s) uploadé(s) avec succès!\n\n` +
                  `Fichiers: ${data.fichiers.join(', ')}\n\n` +
                  `${data.selection.length} fichier(s) en attente d'affichage sur la Raspberry Pi.`);
            
            chargerListeFichiers(); // Recharger la liste
            
            // Tenter une synchronisation auto
            try {
                await fetch('/api/sync', { method: 'POST' });
                logEvent('INFO', 'Auto-sync triggered');
            } catch (e) {
                console.log('Sync non critical');
            }
        } else {
            alert('❌ Erreur lors de l\'upload: ' + data.message);
        }
    } catch (error) {
        console.error('Erreur upload:', error);
        alert('❌ Erreur de connexion lors de l\'upload: ' + error.message);
    } finally {
        if (uploadArea && originalUploadContent !== null) {
            uploadArea.innerHTML = originalUploadContent;
        }
        // Recharger la sélection et la liste en fin d'opération
        chargerListeFichiers();
        chargerSelection();
    }
}

// Fonction pour visualiser un fichier
function visualiserFichier(nomFichier) {
    window.open(SERVER_URL + `/api/fichiers/lecture/${encodeURIComponent(nomFichier)}`, '_blank');
}

// Fonction pour ajouter à la sélection
async function ajouterSelection(nomFichier) {
    try {
        // Récupérer la sélection actuelle
        const response = await fetch('/api/medias');
        const data = await response.json();
        const currentSelection = data.success ? data.medias.map(m => m.nom) : [];
        
        // Ajouter le fichier s'il n'est pas déjà présent
        if (!currentSelection.includes(nomFichier)) {
            currentSelection.push(nomFichier);
            
            // Construire la sélection avec les durées actuelles
            const mediaObjs = data.medias.map(m => ({ nom: m.nom, duration: m.duration || 10 }));
            if (!mediaObjs.some(m => m.nom === nomFichier)) {
                mediaObjs.push({ nom: nomFichier, duration: 10 });
            }

            // Mettre à jour la sélection
            await fetch('/api/selection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fichiers: mediaObjs })
            });
            
            alert(`${nomFichier} ajouté à la sélection pour affichage sur les écrans clients`);
            chargerSelection();
        } else {
            alert(`${nomFichier} est déjà dans la sélection`);
        }
    } catch (error) {
        console.error('Erreur ajout sélection:', error);
        alert('Erreur lors de l\'ajout à la sélection');
    }
}

// Fonction pour supprimer un fichier
async function supprimerFichier(nomFichier) {
    if (!confirm(`Voulez-vous vraiment supprimer ${nomFichier} ?`)) return;
    
    try {
        const response = await fetch(`/api/fichiers/${encodeURIComponent(nomFichier)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            alert(`${nomFichier} supprimé avec succès`);
            chargerListeFichiers(); // Recharger la liste
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur de connexion lors de la suppression');
    }
}

// Fonctions utilitaires
function getFileIcon(type) {
    switch (type) {
        case 'video': return '🎬';
        case 'document': return '📄';
        default: return '📁';
    }
}

function formatTaille(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction pour logger les événements côté client
function logEvent(level, message, details = {}) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage, details);
    
    // Optionnellement envoyer au serveur
    try {
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, message, details })
        }).catch(() => {}); // Silencieux en cas d'erreur
    } catch (e) {
        // Ignorer les erreurs de logging
    }
}

// Fonction pour charger et afficher le status du serveur
async function chargerStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        const statusText = document.getElementById('status-text');
        if (statusText && data.success) {
            const fileCount = data.medias.selected;
            statusText.innerHTML = `
                <strong>✅ Connecté</strong><br>
                Fichiers: <strong>${fileCount}</strong><br>
                <small style="color: #999;">Mise à jour: ${new Date().toLocaleTimeString('fr-FR')}</small>
            `;
            logEvent('INFO', 'Status updated', { medias: fileCount });
        }
    } catch (error) {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.innerHTML = '❌ Serveur indisponible';
            statusText.style.color = '#ff6666';
        }
        logEvent('ERROR', 'Status check failed', { error: error.message });
    }
}

// Auto-refresh du status tous les 10 secondes
setInterval(() => {
    if (document.getElementById('status-text')) {
        chargerStatus();
    }
}, 10000);