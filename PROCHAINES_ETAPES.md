# Prochaines étapes techniques

1. **Valider la PWA** : installation, affichage mobile, permissions caméra, comportement hors ligne.
2. **Créer le vrai service d'appel** : signalisation sécurisée, WebRTC, serveur TURN, codes d'invitation temporaires et gestion de la déconnexion.
3. **Intégrer le suivi facial** : tester MediaPipe Face Landmarker ou une solution comparable sur les appareils visés.
4. **Construire le moteur photoréaliste** : génération d'avatar à partir d'une photo autorisée et animation en temps réel. C'est une étape distincte, exigeante en calcul; ne pas promettre le photoréalisme avant les tests.
5. **Remplacer uniquement la piste vidéo** par la sortie du moteur et garder la piste audio séparée.
6. **Préparer iOS et ordinateur** avec les tests de compatibilité, sécurité, consentement, performances et accessibilité.

La PWA et l'APK éventuel ne sont que l'emballage de l'interface actuelle : ils n'ajoutent pas automatiquement les fonctions IA ou d'appel.
