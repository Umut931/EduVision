const SERVER_URL = 'http://localhost:3000';

// Redirige automatiquement les fetch() relatifs vers le serveur distant
const _originalFetch = window.fetch.bind(window);
window.fetch = function(input, init) {
    if (typeof input === 'string' && input.startsWith('/')) {
        input = SERVER_URL + input;
    }
    return _originalFetch(input, init);
};
