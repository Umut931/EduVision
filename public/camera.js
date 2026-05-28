// Variables globales
let cameraActive = false;
let photosCapturees = [];
let cameraFullscreen = false;
let socket = null;

// Afficher la page caméra
function afficherCamera() {
    const contenu = document.getElementById('contenu-plein-ecran');
    if (!contenu) return;

    contenu.innerHTML = `
        <h2>Caméra Live 🔴</h2>
        <div class="camera-container">
            <img id="camera-img" class="camera-video" />

            <div class="camera-controls">
                <button class="btn-camera" id="btn-capture" onclick="capturerPhoto()">📸 Capturer</button>
                <button class="btn-camera" id="btn-fullscreen" onclick="basculerPleinEcranCamera()">⛶ Plein écran</button>
                <button class="btn-camera" id="btn-gallery" onclick="afficherGalerie()" style="display: none;">
                    🖼️ Galerie (<span id="count-photos">0</span>)
                </button>
                <button class="btn-camera" id="btn-eteindre" onclick="fermerCameraPage()">⏹️ Éteindre</button>
            </div>
        </div>
    `;

    demarrerCamera();
}

// Fermer la page caméra
function fermerCameraPage() {
    arreterCamera();
    window.close();
}

// Démarrer la caméra IP
function demarrerCamera() {
    const img = document.getElementById('camera-img');
    if (!img) return;

    socket = io(SERVER_URL);

    socket.on('camera-frame', function(data) {
        img.src = 'data:image/jpeg;base64,' + data;
        cameraActive = true;
        const err = document.getElementById('camera-error');
        if (err) err.remove();
    });

    socket.on('camera-error', function(data) {
        const container = document.querySelector('.camera-container') || document.getElementById('contenu-plein-ecran');
        if (!container) return;
        let err = document.getElementById('camera-error');
        if (!err) {
            err = document.createElement('div');
            err.id = 'camera-error';
            err.style.cssText = 'background:#7f1d1d;color:#fca5a5;padding:20px 24px;border-radius:10px;margin:20px auto;max-width:600px;font-size:1.1em;text-align:center;';
            container.prepend(err);
        }
        err.textContent = '⚠️ ' + (data.message || 'Erreur caméra inconnue.');
    });

    fetch('/start-camera')
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Le serveur n\'a pas pu démarrer le flux caméra');
            }
            return response.json();
        })
        .then(function() {
            console.log('Flux caméra démarré');
        })
        .catch(function(error) {
            console.error('Erreur démarrage caméra:', error);
        });
}

// Arrêter la caméra
function arreterCamera() {
    cameraActive = false;

    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

function attendreManifest(url, timeoutMs = 30000, intervalMs = 1000) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const check = () => {
            fetch(url, { method: 'GET', cache: 'no-store' })
                .then((response) => {
                    if (response.ok) {
                        resolve(true);
                    } else {
                        if (Date.now() - start >= timeoutMs) {
                            reject(new Error('Manifest HLS introuvable après ' + timeoutMs + ' ms'));
                        } else {
                            setTimeout(check, intervalMs);
                        }
                    }
                })
                .catch(() => {
                    if (Date.now() - start >= timeoutMs) {
                        reject(new Error('Manifest HLS introuvable après ' + timeoutMs + ' ms'));
                    } else {
                        setTimeout(check, intervalMs);
                    }
                });
        };

        check();
    });
}

// Capturer une photo depuis la vidéo
function capturerPhoto() {
    const img = document.getElementById('camera-img');
    if (!img) return;

    if (!cameraActive) {
        alert('La caméra n\'est pas encore active.');
        return;
    }

    if (!img.src || img.src === '') {
        alert('Le flux image n\'est pas encore prêt.');
        return;
    }

    const imageData = img.src; // Already base64 JPEG
    const timestamp = new Date().toLocaleString('fr-FR');

    photosCapturees.push({
        id: Date.now(),
        data: imageData,
        timestamp: timestamp
    });

    const btnGallery = document.getElementById('btn-gallery');
    const countPhotos = document.getElementById('count-photos');

    if (btnGallery) {
        btnGallery.style.display = 'inline-block';
    }

    if (countPhotos) {
        countPhotos.textContent = photosCapturees.length;
    }

    const btnCapture = document.getElementById('btn-capture');
    if (btnCapture) {
        const texteOriginal = btnCapture.textContent;
        btnCapture.textContent = '✓ Photo capturée !';
        btnCapture.style.background = '#28a745';

        setTimeout(function() {
            btnCapture.textContent = texteOriginal;
            btnCapture.style.background = '';
        }, 1500);
    }
}

// Basculer en plein écran pour la caméra
function basculerPleinEcranCamera() {
    const img = document.getElementById('camera-img');
    if (!img) return;

    if (!cameraFullscreen) {
        if (img.requestFullscreen) {
            img.requestFullscreen();
        } else if (img.webkitRequestFullscreen) {
            img.webkitRequestFullscreen();
        } else if (img.msRequestFullscreen) {
            img.msRequestFullscreen();
        }
        cameraFullscreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        cameraFullscreen = false;
    }
}

// Nettoyage à la fermeture de la page
window.addEventListener('beforeunload', function() {
    arreterCamera();
});
