# NadDigital Airtel Gateway

Passerelle à IP fixe entre Supabase et les API Airtel Money RDC.

## Pourquoi ce gateway existe

Airtel exige que les appels API proviennent d'une adresse IP publique autorisée. Les Supabase Edge Functions n'ont pas d'IP de sortie unique et permanente, donc NadDigital utilise un petit serveur intermédiaire possédant une IPv4 statique.

Flux prévu :

`NadDigital -> Supabase Edge Function -> Airtel Gateway (IP fixe) -> Airtel Money`

## État actuel

Le serveur est prêt pour :

- `GET /health`
- authentification HMAC entre Supabase et le gateway
- validation de base des requêtes
- `POST /v1/airtel/payment`
- `POST /v1/airtel/status`

Les deux routes Airtel restent volontairement en mode `airtel_adapter_not_configured` tant que les paramètres exacts OAuth2, chiffrement et signature ne sont pas configurés depuis la documentation officielle du portail Airtel RDC.

## Secrets

Ne jamais enregistrer de vraie clé Airtel dans GitHub.

Les secrets doivent uniquement être fournis au serveur via variables d'environnement :

- `GATEWAY_SHARED_SECRET`
- `AIRTEL_CLIENT_ID`
- `AIRTEL_CLIENT_SECRET`
- clés de chiffrement/signature Airtel lorsqu'elles seront fournies

## Déploiement Docker sur Ubuntu

Installer Docker sur le VPS selon la documentation officielle de Docker, puis :

```bash
git clone https://github.com/nadmit21-ux/NadDigital.git
cd NadDigital/gateway
cp .env.example .env
```

Modifier `.env` sur le serveur, puis :

```bash
docker build -t naddigital-airtel-gateway .
docker run -d \
  --name naddigital-airtel-gateway \
  --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:8080:8080 \
  naddigital-airtel-gateway
```

Le conteneur est volontairement lié à `127.0.0.1`. En production, placer Caddy ou Nginx devant lui avec HTTPS. Ne pas exposer directement le port 8080 à Internet.

## Test local sur le serveur

```bash
curl http://127.0.0.1:8080/health
```

Réponse attendue :

```json
{
  "ok": true,
  "service": "naddigital-airtel-gateway",
  "version": "0.1.0",
  "airtel_mode": "TEST",
  "static_ip_ready": true
}
```

## Whitelist Airtel

Une fois le VPS créé et son IPv4 statique attachée :

1. relever l'IPv4 publique fixe du VPS ;
2. l'ajouter dans Airtel Developer -> Sécurité -> Liste des IP de serveur autorisées ;
3. rester en mode TEST ;
4. tester uniquement les APIs staging ;
5. ne passer en production qu'après approbation Airtel et validation complète du flux.

## Authentification Supabase -> gateway

Chaque requête privée doit contenir :

- `X-ND-Timestamp`: timestamp Unix en secondes ;
- `X-ND-Signature`: HMAC-SHA256 hexadécimal.

Chaîne signée :

```text
<timestamp>\n<METHOD>\n<PATH>\n<raw-json-body>
```

Le secret HMAC doit être identique dans Supabase et sur le gateway, mais ne doit jamais être envoyé au navigateur.

## Sécurité

- garder Airtel en mode TEST pendant l'intégration ;
- HTTPS obligatoire avant les tests distants ;
- firewall : SSH restreint, HTTP/HTTPS uniquement ;
- aucune clé secrète dans GitHub ;
- aucun PIN Airtel Money n'est collecté par NadDigital ;
- le succès d'un appel HTTP ne suffit pas à considérer un paiement comme payé : le statut Airtel doit être vérifié par Transaction Enquiry ou callback.
