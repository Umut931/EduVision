# Test de Synchronisation PDF

## Versions Corrigées

### Problème Original
- Quand un PDF était déposé, il ne s'affichait pas sur la Raspberry Pi client
- Il fallait cliquer manuellement sur le bouton PDF sync
- Les clients Raspberry ne recevaient pas l'événement WebSocket

### Corrections Appliquées

1. **Route `/api/upload` améliorée**
   - Détecte automatiquement les fichiers PDF
   - Estime le nombre de pages du PDF
   - Appelle `setPdfPage()` pour synchroniser
   - Force la page d'affichage à 'documents'
   - Notifie tous les clients Raspberry

2. **Fonction `estimatePdfPages()` créée**
   - Estime le nombre de pages basé sur la taille du fichier
   - Heuristique: ~1 page par 10KB
   - Retourne 10 par défaut en case d'erreur

3. **Route `/api/pdf/page` améliorée**
   - Estime les pages avant de synchroniser
   - Force la page d'affichage à 'documents'

4. **Registration du client Raspberry corrigée**
   - Ajoute `zoom` à l'événement `pdf-sync`

## Comment Tester

### 1. Démarrer le serveur
```bash
cd /home/pi/Desktop/EduVision-main
npm start
```

### 2. Ouvrir l'interface admin
```
http://localhost:3000
```

### 3. Connecter un client Raspberry
```
http://<IP_SERVEUR>:3000/client/screen1
```

### 4. Tester le dépôt de PDF
- Dans l'interface admin, aller à "📁 Gestion des fichiers"
- Déposer un fichier PDF dans la zone "Glissez des fichiers ici"
- **RÉSULTAT ATTENDU**: 
  - Le PDF devrait s'afficher immédiatement sur le client Raspberry
  - La page 1 devrait être affichée
  - Le mini-écran d'aperçu devrait montrer le PDF

### 5. Tester les contrôles PDF
- Cliquer sur les boutons "Suivant" et "Précédent" sur le client Raspberry
- **RÉSULTAT ATTENDU**: 
  - Les pages devraient changer sur le client
  - L'interface admin devrait montrer la page courante

### 6. Vérifier les logs
```bash
tail -f logs/*.log
```

Chercher les messages:
- `✅ PDF synchronisé avec les clients`
- `Nombre de pages PDF estimé`
- `Client Raspberry enregistré`
- `Pages estimées`

## Flux Complet de Synchronisation

1. Admin dépose PDF
2. Route `/api/upload` reçoit le fichier
3. Serveur détecte PDF et estime pages
4. `setPdfPage()` met à jour le statut
5. `broadcastPdfSync()` envoie l'événement WebSocket
6. Tous les clients Raspberry reçoivent `pdf-sync`
7. Clients affichent le PDF avec `renderPdfPage()`

## Points de Débogage

Si le PDF n'apparaît pas:

1. **Vérifier les logs serveur**
   - Y a-t-il un message d'erreur?
   - Le PDF est-il bien détecté?

2. **Vérifier la connexion WebSocket**
   - Ouvrir les DevTools du client Raspberry (F12)
   - Vérifier la console pour les erreurs
   - Vérifier l'onglet Network pour les émissions WebSocket

3. **Vérifier que le client est enregistré**
   - Chercher "Client Raspberry enregistré" dans les logs
   - Verfiez l'ID du socket

4. **Vérifier les permissions**
   - Le dossier `fichiers/` est-il accessible?
   - Le fichier PDF est-il bien écrit?

## Fichiers Modifiés

- `server.js`: 
  - Fonction `estimatePdfPages()` (NEW)
  - Route `/api/upload` (IMPROVED)
  - Route `/api/pdf/page` (IMPROVED)
  - Fonction `register-display-client` (IMPROVED)
  - Fonction `setPdfPage()` (IMPROVED)

## Notes

- L'estimation des pages est basée sur la taille du fichier
- Pour une meilleure précision, utilisez une bibliothèque comme `pdf-parse`
- Le zoom est appliqué avec `transform: scale()` en CSS
- La pagination est gérée via les événements Socket.IO
