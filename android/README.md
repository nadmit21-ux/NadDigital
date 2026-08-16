# AnonBox Android

Application Android légère qui ouvre directement l’espace privé AnonBox hébergé sur GitHub Pages.

- URL propriétaire : `https://nadmit21-ux.github.io/NadDigital/anonbox/?app=1`
- Min SDK : Android 8.0 (API 26)
- Connexion et messages : Supabase via l’application web AnonBox
- Choix d’image/logo : pris en charge par le sélecteur de fichiers Android
- Liens externes (WhatsApp, etc.) : ouverts avec les applications du téléphone

Le workflow GitHub Actions `anonbox-android.yml` compile l’APK et publie toujours la dernière version sous le tag `anonbox-latest`.
