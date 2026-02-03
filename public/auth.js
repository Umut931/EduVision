// ===================== SYSTÈME D'AUTHENTIFICATION =====================

// CONFIGURE LE MOT DE PASSE ICI (à personnaliser)
const MOT_DE_PASSE_CORRECT = 'Bergson75';

function verifierMotDePasse(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('password');
    const motDePasse = passwordInput.value;
    const errorMessage = document.getElementById('error-message');
    
    if (motDePasse === MOT_DE_PASSE_CORRECT) {
        // Authentification réussie
        sessionStorage.setItem('authenticated', 'true');
        afficherGestionnaire();
        errorMessage.style.display = 'none';
    } else {
        // Mot de passe incorrect
        errorMessage.textContent = '❌ Mot de passe incorrect';
        errorMessage.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function afficherGestionnaire() {
    const loginContainer = document.getElementById('login-container');
    const containerPrincipal = document.getElementById('container-principal');
    
    loginContainer.style.display = 'none';
    containerPrincipal.style.display = 'block';
    
    // Démarrer la mise à jour de l'horloge du bouton
    mettreAJourHeure();
    intervalId = setInterval(mettreAJourHeure, 1000);
}

function seDeconnecter() {
    // Confirmer la déconnexion
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        // Arrêter la caméra si elle est active
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Arrêter l'horloge
        if (intervalId) {
            clearInterval(intervalId);
        }
        
        // Réinitialiser l'authentification
        sessionStorage.removeItem('authenticated');
        
        // Retourner à la page de connexion
        const loginContainer = document.getElementById('login-container');
        const containerPrincipal = document.getElementById('container-principal');
        const containerPleinEcran = document.getElementById('container-plein-ecran');
        const header = document.getElementById('plein-ecran-header');
        
        loginContainer.style.display = 'block';
        containerPrincipal.style.display = 'none';
        containerPleinEcran.style.display = 'none';
        header.style.display = 'none';
        
        // Vider et réinitialiser le champ de mot de passe
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
        document.getElementById('error-message').style.display = 'none';
    }
}

// Vérifier l'authentification au chargement de la page
window.addEventListener('load', function() {
    const authenticated = sessionStorage.getItem('authenticated');
    
    if (authenticated === 'true') {
        afficherGestionnaire();
    } else {
        // S'assurer que la page de connexion est visible
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('container-principal').style.display = 'none';
        document.getElementById('password').focus();
    }
});
