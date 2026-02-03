// Variables globales pour la caméra
let cameraStream = null;
let cameraActive = false;
let photosCapturees = [];

function afficherCamera() {
    entrerModePleinEcran('📷 Caméra');
    const contenu = document.getElementById('contenu-plein-ecran');
    
    contenu.innerHTML = `
        <h2>Caméra Live 🔴</h2>
        <div class="camera-container">
            <video id="camera-video" class="camera-video" playsinline autoplay></video>
            <div class="camera-controls">
                <button class="btn-camera" id="btn-capture" onclick="capturerPhoto()">📸 Capturer</button>
                <button class="btn-camera" id="btn-flip" onclick="basculerCamera()" style="display: none;">🔄 Basculer</button>
                <button class="btn-camera" id="btn-fullscreen" onclick="basculerPleinEcranCamera()">⛶ Plein écran</button>
                <button class="btn-camera" id="btn-gallery" onclick="afficherGalerie()" style="display: none;">🖼️ Galerie (<span id="count-photos">0</span>)</button>
            </div>
        </div>
    `;
    
    // Démarrer la caméra
    demarrerCamera();
}

function demarrerCamera() {
    const video = document.getElementById('camera-video');
    
    if (!video) {
        return;
    }
    
    // Vérifier la disponibilité de getUserMedia
    const constraints = {
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            cameraStream = stream;
            cameraActive = true;
            video.srcObject = stream;
            
            // Vérifier si la caméra peut être basculée (caméras multiples)
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                if (videoDevices.length > 1) {
                    document.getElementById('btn-flip').style.display = 'inline-block';
                }
            });
        })
        .catch(function(err) {
            const contenu = document.getElementById('contenu-plein-ecran');
            contenu.innerHTML = `
                <h2>Caméra Live 🔴</h2>
                <div style="text-align: center; padding: 40px; background: #fff3cd; border-radius: 10px; margin-top: 30px;">
                    <p style="font-size: 1.3em; color: #856404; margin-bottom: 15px;">⚠️ Erreur d'accès à la caméra</p>
                    <p style="color: #856404; margin-bottom: 20px;">
                        ${err.name === 'NotAllowedError' ? 
                            'L\'accès à la caméra a été refusé. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.' :
                            'Aucune caméra n\'a été détectée sur votre appareil.'}
                    </p>
                    <button class="btn-action" onclick="afficherAccueil()">⬅️ Retour</button>
                </div>
            `;
        });
}

function capturerPhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    // Stocker l'image dans le tableau
    const imageData = canvas.toDataURL('image/png');
    const timestamp = new Date().toLocaleString('fr-FR');
    
    photosCapturees.push({
        data: imageData,
        timestamp: timestamp,
        id: Date.now()
    });
    
    // Mettre à jour l'affichage du bouton galerie
    const btnGallery = document.getElementById('btn-gallery');
    if (btnGallery) {
        btnGallery.style.display = 'inline-block';
        document.getElementById('count-photos').textContent = photosCapturees.length;
    }
    
    // Feedback visuel
    const btn = document.getElementById('btn-capture');
    const texteOriginal = btn.textContent;
    btn.textContent = '✓ Photo capturée!';
    btn.style.background = '#28a745';
    setTimeout(() => {
        btn.textContent = texteOriginal;
        btn.style.background = '';
    }, 2000);
}

let cameraIndex = 0;

function basculerCamera() {
    if (!cameraActive) return;
    
    // Arrêter la caméra actuelle
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    
    cameraIndex++;
    
    // Obtenir toutes les caméras disponibles
    navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
            alert('Aucune caméra disponible');
            return;
        }
        
        // Boucler à travers les caméras
        const deviceId = videoDevices[cameraIndex % videoDevices.length].deviceId;
        
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                const video = document.getElementById('camera-video');
                if (video) {
                    cameraStream = stream;
                    video.srcObject = stream;
                }
            })
            .catch(function(err) {
                console.error('Erreur lors du basculement de caméra:', err);
            });
    });
}

// Plein écran caméra
let cameraFullscreen = false;

function basculerPleinEcranCamera() {
    const video = document.getElementById('camera-video');
    const container = document.getElementById('container-plein-ecran');
    const header = document.getElementById('plein-ecran-header');
    const btn = document.getElementById('btn-fullscreen');
    
    if (!video) return;
    
    cameraFullscreen = !cameraFullscreen;
    
    if (cameraFullscreen) {
        // Entrer en plein écran - cacher l'en-tête
        video.classList.add('camera-fullscreen');
        container.classList.add('camera-fullscreen-mode');
        header.classList.add('header-hidden');
        btn.textContent = '⛶ Normal';
        btn.style.background = '#d32f2f';
    } else {
        // Quitter le plein écran - afficher l'en-tête
        video.classList.remove('camera-fullscreen');
        container.classList.remove('camera-fullscreen-mode');
        header.classList.remove('header-hidden');
        btn.textContent = '⛶ Plein écran';
        btn.style.background = '';
    }
}

// Galerie de photos
function afficherGalerie() {
    const contenu = document.getElementById('contenu-plein-ecran');
    
    if (photosCapturees.length === 0) {
        return;
    }
    
    let galerieHTML = `
        <div class="gallery-view">
            <div class="gallery-header">
                <h2>🖼️ Galerie de photos (${photosCapturees.length})</h2>
                <button class="btn-gallery-close" onclick="afficherCamera()">Retour à la caméra</button>
            </div>
            <div class="gallery-grid">
    `;
    
    photosCapturees.forEach(photo => {
        galerieHTML += `
            <div class="gallery-item">
                <img src="${photo.data}" alt="Photo" class="gallery-img">
                <div class="gallery-info">
                    <p class="gallery-timestamp">${photo.timestamp}</p>
                    <div class="gallery-actions">
                        <button class="btn-gallery-action" onclick="telechargerPhoto(${photo.id})" title="Télécharger">⬇️</button>
                        <button class="btn-gallery-action delete" onclick="supprimerPhoto(${photo.id})" title="Supprimer">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    galerieHTML += `
            </div>
            <div class="gallery-footer">
                <button class="btn-camera" onclick="telechargerToutPhotos()">⬇️ Télécharger tout</button>
                <button class="btn-camera delete" onclick="viderGalerie()">🗑️ Vider la galerie</button>
                <button class="btn-camera" onclick="afficherCamera()">Retour</button>
            </div>
        </div>
    `;
    
    contenu.innerHTML = galerieHTML;
}

function supprimerPhoto(id) {
    photosCapturees = photosCapturees.filter(photo => photo.id !== id);
    
    // Mettre à jour le compteur
    const btnGallery = document.getElementById('btn-gallery');
    if (btnGallery && photosCapturees.length === 0) {
        btnGallery.style.display = 'none';
        afficherCamera();
    } else {
        afficherGalerie();
        if (btnGallery) {
            document.getElementById('count-photos').textContent = photosCapturees.length;
        }
    }
}

function viderGalerie() {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les photos ?')) {
        photosCapturees = [];
        const btnGallery = document.getElementById('btn-gallery');
        if (btnGallery) {
            btnGallery.style.display = 'none';
        }
        afficherCamera();
    }
}

function telechargerPhoto(id) {
    const photo = photosCapturees.find(p => p.id === id);
    if (!photo) return;
    
    const link = document.createElement('a');
    link.href = photo.data;
    link.download = `photo-${photo.id}.png`;
    link.click();
}

function telechargerToutPhotos() {
    photosCapturees.forEach(photo => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = photo.data;
            link.download = `photo-${photo.id}.png`;
            link.click();
        }, 200);
    });
}

// Arrêter la caméra quand on quitte
window.addEventListener('beforeunload', function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});
