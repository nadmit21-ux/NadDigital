# NadDigital

NadDigital est une boutique numérique responsive destinée à vendre des e-books, des créations musicales et des services.

## V1 actuelle

- Catalogue avec recherche et filtres
- Panier persistant dans le navigateur
- Création d'une commande avec identifiant `ND-...`
- Paiements manuels Airtel Money / M-Pesa configurables
- Avertissement tant qu'aucun numéro officiel n'est configuré
- Interface responsive mobile / tablette / ordinateur
- Manifest PWA et service worker
- Build automatisé par GitHub Actions

## Configuration importante

Les coordonnées de paiement et de contact se trouvent dans :

`src/storeConfig.js`

Les prix présents dans la première version sont **provisoires**. Remplacez-les avant toute mise en vente officielle.

Ne placez jamais de secret, mot de passe, clé API privée, numéro de carte bancaire ou CVV dans le dépôt ou dans le code côté client.

## Développement local

```bash
npm install
npm run dev
```

## Build de production

```bash
npm run build
```

Le site compilé est généré dans `dist/`.

GitHub Actions exécute automatiquement ce build sur `main` et publie le dossier compilé comme artefact `naddigital-dist`.

## Publication web

Le projet est configuré avec le chemin de base `/NadDigital/` pour pouvoir être publié comme site de projet GitHub Pages. Si le dépôt reste privé, la disponibilité de GitHub Pages dépend du forfait GitHub du propriétaire du dépôt. Un dépôt public peut utiliser GitHub Pages avec GitHub Free.

## Étapes suivantes

1. Remplacer les prix provisoires.
2. Ajouter les vrais numéros Mobile Money et les coordonnées de contact.
3. Ajouter les couvertures et fichiers d'aperçu des produits.
4. Activer l'hébergement web.
5. Ajouter plus tard un backend sécurisé pour la validation automatique des paiements et la livraison protégée des fichiers.
