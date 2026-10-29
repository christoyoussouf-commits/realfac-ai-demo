# Guide pas à pas — téléphone Android uniquement

## Partie 1 — Tester dans le navigateur

1. Téléchargez `REALFACE_AI_option_C.zip` sur votre téléphone.
2. Décompressez le ZIP avec l’application Fichiers de votre téléphone.
3. Le simple fait d’ouvrir `index.html` depuis les fichiers peut empêcher l’accès à la caméra. Il faut publier les fichiers sur un hébergement HTTPS.
4. La méthode la plus accessible consiste à utiliser GitHub depuis Chrome :
   - Connectez-vous ou créez un compte sur GitHub.
   - Créez un dépôt public nommé `realfac-ai-demo` (ne mettez pas de photos personnelles dans le dépôt).
   - Utilisez « Add file » puis « Upload files » pour envoyer les fichiers et dossiers de cette archive.
   - Dans les paramètres du dépôt, ouvrez **Pages** et activez le déploiement depuis la branche `main`, dossier `/ (root)`.
   - Attendez que GitHub Pages affiche une adresse HTTPS. Ouvrez-la dans Chrome Android.
5. Appuyez sur « Activer la caméra » et acceptez l’autorisation. Essayez aussi d’importer une photo autorisée.
6. Pour installer la version Web comme une application : dans Chrome, ouvrez le menu ⋮ et cherchez **Installer l’application** ou **Ajouter à l’écran d’accueil**. Le libellé varie selon la version de Chrome.

## Partie 2 — Préparer un APK

La méthode la plus simple sans ordinateur est un service de conversion de PWA vers Android, par exemple PWABuilder. Les services et exigences évoluent, et la génération peut demander des métadonnées ou une icône PNG.

1. D’abord, publiez et vérifiez la version HTTPS comme indiqué ci-dessus.
2. Ouvrez le site officiel `https://www.pwabuilder.com/` dans Chrome et saisissez l’adresse publique de REALFACE AI.
3. Laissez l’outil analyser le site. Corrigez les erreurs signalées avant de poursuivre.
4. Choisissez l’option de création de paquet Android si elle est proposée, puis suivez les étapes affichées. Selon les options disponibles, il peut produire un paquet Android App Bundle ou un APK, ou demander une configuration de signature.
5. Gardez la clé de signature privée et sauvegardée. Ne la partagez jamais. N’installez qu’un fichier provenant de votre propre projet et d’une source de confiance.
6. Si le service ne peut pas créer d’APK directement, il faudra utiliser un service de compilation cloud compatible ou demander à un développeur de générer le paquet signé.

## Ce que cette version fait réellement
- Interface responsive en français.
- Activation de la caméra en aperçu local après autorisation.
- Importation locale d’une photo avec vérification du consentement.
- PWA de base avec manifeste et cache hors ligne de l’interface.

## Ce qu’elle ne fait pas encore
- Aucun appel entre deux utilisateurs.
- Aucun avatar photoréaliste animé par IA.
- Aucun compte utilisateur ou serveur sécurisé.
- Le microphone n’est pas capturé dans cette version.

## Conseil
N’utilisez pas de photo intime ou sensible. Avant de traiter des photos d’autres personnes, obtenez leur autorisation explicite. Indiquez clairement aux interlocuteurs quand le visage est transformé par IA.
