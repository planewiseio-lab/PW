# Configuration Stripe pour PlaneWise

Ce guide vous explique comment configurer Stripe pour activer les paiements et abonnements dans PlaneWise.

## Prérequis

1. Compte Stripe (créer un compte sur [stripe.com](https://stripe.com))
2. Accès au Dashboard Stripe
3. Variables d'environnement configurées

## Étape 1 : Créer les Produits dans Stripe Dashboard

1. Connectez-vous au [Stripe Dashboard](https://dashboard.stripe.com)
2. Allez dans **Products** → **Add product**
3. Créez 3 produits correspondant à vos plans :

### Plan Basic ($9.99/mois)

- **Name**: Basic Plan
- **Description**: For aviation enthusiasts - 500 requests per month
- **Pricing**:
  - Type: Recurring
  - Price: $9.99 USD
  - Billing period: Monthly
- **Metadata** (optionnel):
  - `plan`: `BASIC`
  - `requests`: `500`

### Plan Pro ($19.99/mois)

- **Name**: Pro Plan
- **Description**: For professionals - 2500 requests per month
- **Pricing**:
  - Type: Recurring
  - Price: $19.99 USD
  - Billing period: Monthly
- **Metadata** (optionnel):
  - `plan`: `PRO`
  - `requests`: `2500`

### Plan Business (si nécessaire)

- Suivez le même format avec vos prix et métadonnées

## Étape 2 : Récupérer les Price IDs

1. Après avoir créé chaque produit, cliquez sur le produit
2. Copiez le **Price ID** (commence par `price_...`)
3. Notez ces Price IDs pour l'étape suivante

## Étape 3 : Configurer les Variables d'Environnement

Ajoutez les variables suivantes dans votre fichier `.env.local` :

```bash
# Stripe Secret Key (trouvable dans Developers → API keys)
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_... pour production

# Stripe Webhook Secret (voir étape 5)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Publishable Key (optionnel pour le frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # ou pk_live_... pour production

# Price IDs des produits créés
STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_BUSINESS=price_xxxxxxxxxxxxx # si nécessaire

# URL du site (pour les redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # ou https://votre-domaine.com pour production
```

## Étape 4 : Configurer le Webhook

### En développement local

1. Installer [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Se connecter : `stripe login`
3. Forwarder les webhooks : `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copier le `whsec_...` affiché et l'ajouter à `.env.local`

### En production (Vercel/autre)

1. Dans Stripe Dashboard, allez dans **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL du endpoint : `https://votre-domaine.com/api/stripe/webhook`
4. Événements à écouter :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed` (optionnel)
5. Copiez le **Signing secret** (commence par `whsec_...`) et ajoutez-le à vos variables d'environnement

## Étape 5 : Tester

1. Démarrez votre serveur de développement
2. Naviguez vers une page contenant `SubscriptionCard`
3. Sélectionnez un plan (Basic ou Pro)
4. Cliquez sur "Subscribe to [Plan]"
5. Utilisez les [cartes de test Stripe](https://stripe.com/docs/testing) :
   - Succès : `4242 4242 4242 4242`
   - Date : n'importe quelle date future
   - CVC : n'importe quel 3 chiffres
   - Code postal : n'importe quel code postal
6. Complétez le checkout
7. Vous devriez être redirigé vers `/checkout/success`

## Cartes de Test Stripe

- **Succès** : `4242 4242 4242 4242`
- **3D Secure requis** : `4000 0025 0000 3155`
- **Paiement refusé** : `4000 0000 0000 0002`
- **Carte expirée** : `4000 0000 0000 0069`

Voir la [documentation complète des cartes de test](https://stripe.com/docs/testing)

## Troubleshooting

### Le bouton ne fait rien

- Vérifiez que les variables d'environnement sont bien définies
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez les logs serveur

### Erreur "Price ID not configured"

- Vérifiez que `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_PRO`, etc. sont définis
- Vérifiez que les Price IDs commencent par `price_`

### Le webhook ne fonctionne pas

- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- En local, assurez-vous que Stripe CLI est en cours d'exécution
- En production, vérifiez que l'URL du webhook est correcte dans Stripe Dashboard

### La subscription n'est pas mise à jour

- Vérifiez les logs du webhook dans Stripe Dashboard
- Vérifiez que les événements sont bien enregistrés
- Vérifiez la base de données pour voir si la subscription est créée

## Passage en Production

1. Basculez en mode Live dans Stripe Dashboard
2. Créez les mêmes produits en mode Live
3. Mettez à jour les variables d'environnement avec les clés Live :
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → nouveau secret du webhook Live
   - `STRIPE_PRICE_ID_*` → nouveaux Price IDs Live
4. Configurez le webhook en production
5. Testez avec une vraie carte (vous pouvez annuler immédiatement)

## Support

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)

