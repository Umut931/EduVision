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
            <div id="files-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                <p style="grid-column: 1 / -1; text-align: center; color: #666;">Chargement des fichiers...</p>
            </div>
        </div>
    `;
    
    // Charger la liste des fichiers et la sélection
    chargerListeFichiers();
    chargerSelection();
    chargerStatus();
    
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
    
    filesList.innerHTML = fichiers.map(fichier => `
        <div class="file-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 2em;">${getFileIcon(fichier.type)}</div>
            <div style="text-align: center;">
                <div style="font-weight: bold; word-break: break-word;">${fichier.nom}</div>
                <div style="font-size: 0.8em; color: #666;">${formatTaille(fichier.taille)}</div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-camera" onclick="visualiserFichier('${fichier.nom}')" title="Visualiser">👁️</button>
                <button class="btn-camera" onclick="ajouterSelection('${fichier.nom}')" title="Ajouter à la sélection">➕</button>
                <button class="btn-camera" style="background: #d32f2f;" onclick="supprimerFichier('${fichier.nom}')" title="Supprimer">🗑️</button>
            </div>
        </div>
    `).join('');
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
    window.open(`/api/fichiers/lecture/${encodeURIComponent(nomFichier)}`, '_blank');
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
