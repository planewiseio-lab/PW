# Prochaines Étapes - Configuration Stripe

Vos variables Stripe sont configurées dans `.env.local`. Voici ce qu'il vous reste à faire :

## ✅ Étape 1 : Vérifier les Produits Stripe

Assurez-vous d'avoir créé vos produits dans le [Stripe Dashboard](https://dashboard.stripe.com) :

1. Connectez-vous à votre [Stripe Dashboard](https://dashboard.stripe.com)
2. Allez dans **Products**
3. Vérifiez que vous avez créé les produits suivants :

   - **Basic Plan** ($9.99/mois)
   - **Pro Plan** ($19.99/mois)
   - **Business Plan** (si nécessaire)

4. Pour chaque produit, vérifiez que vous avez copié le **Price ID** (commence par `price_...`) dans votre `.env.local` :
   ```bash
   STRIPE_PRICE_ID_BASIC=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx
   STRIPE_PRICE_ID_BUSINESS=price_xxxxxxxxxxxxx
   ```

> ⚠️ **Important** : Si vous n'avez pas encore créé les produits, suivez les étapes 1-2 dans `docs/stripe-setup.md`

---

## 🔧 Étape 2 : Configurer le Webhook

### En développement local (PRIORITÉ)

Le webhook est **CRITIQUE** pour que les abonnements fonctionnent. Sans lui, les paiements se feront mais les abonnements ne seront pas activés dans votre base de données.

#### Installation de Stripe CLI

1. **Installer Stripe CLI** :

   - **Windows** : Téléchargez depuis [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
   - Ou utilisez : `winget install stripe.stripe-cli` (si vous avez winget)
   - Ou téléchargez le `.exe` depuis [GitHub Releases](https://github.com/stripe/stripe-cli/releases)

2. **Se connecter** :

   ```bash
   stripe login
   ```

   Cela ouvrira votre navigateur pour vous authentifier.

3. **Démarrer le forwarding des webhooks** :

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copier le Webhook Secret** :
   Après avoir exécuté la commande, Stripe CLI affichera quelque chose comme :

   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

   Copiez ce `whsec_...` et ajoutez-le à votre `.env.local` :

   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Garder le terminal ouvert** : Laissez cette commande s'exécuter pendant que vous testez. Vous verrez les événements webhook en temps réel.

### En production

1. Dans [Stripe Dashboard](https://dashboard.stripe.com), allez dans **Developers** → **Webhooks**
2. Cliquez sur **Add endpoint**
3. URL du endpoint : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionnez les événements à écouter :
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed` (optionnel)
5. Copiez le **Signing secret** (commence par `whsec_...`) et ajoutez-le à vos variables d'environnement de production

---

## 🧪 Étape 3 : Tester le Système

1. **Démarrer votre serveur de développement** :

   ```bash
   npm run dev
   # ou
   yarn dev
   ```

2. **Dans un autre terminal, démarrer Stripe CLI** (si en local) :

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Trouver la page avec SubscriptionCard** :

   - Cherchez dans votre application où le composant `SubscriptionCard` est utilisé
   - Ou accédez à `/credits` ou `/account-settings` (selon votre configuration)

4. **Tester un abonnement** :

   - Sélectionnez un plan (Basic ou Pro)
   - Cliquez sur "Subscribe to [Plan]"
   - Utilisez une **carte de test Stripe** :
     - Numéro : `4242 4242 4242 4242`
     - Date : n'importe quelle date future (ex: 12/25)
     - CVC : n'importe quel 3 chiffres (ex: 123)
     - Code postal : n'importe quel code postal

5. **Vérifier le résultat** :
   - Vous devriez être redirigé vers `/checkout/success`
   - Vérifiez dans votre base de données que la subscription a été créée/mise à jour
   - Vérifiez dans le terminal Stripe CLI que les événements webhook ont été reçus

---

## 🔍 Vérification des Variables d'Environnement

Assurez-vous que votre `.env.local` contient **TOUTES** ces variables :

```bash
# Clés Stripe (obligatoires)
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_... en production
STRIPE_WEBHOOK_SECRET=whsec_... # OBLIGATOIRE pour les webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # optionnel mais recommandé

# Price IDs des produits (obligatoires)
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BUSINESS=price_... # si nécessaire

# URL du site (obligatoire)
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # ou https://votre-domaine.com en production
```

---

## 🚨 Problèmes Courants

### "Webhook signature verification failed"

- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct dans `.env.local`
- En local, assurez-vous d'utiliser le secret généré par `stripe listen`
- **Redémarrez votre serveur** après avoir modifié `.env.local`

### "Price ID not configured"

- Vérifiez que `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_PRO`, etc. sont définis
- Vérifiez que les Price IDs commencent bien par `price_`
- Vérifiez que les produits existent dans votre Stripe Dashboard

### La subscription n'est pas activée après le paiement

- **Vérifiez que Stripe CLI est en cours d'exécution** (en local)
- Vérifiez les logs dans le terminal Stripe CLI
- Vérifiez les logs de votre serveur Next.js
- Vérifiez la base de données pour voir si la subscription a été créée

### Le bouton ne fait rien

- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que vous êtes connecté (authentification requise)
- Vérifiez les logs serveur

---

## 📚 Ressources

- [Documentation complète Stripe Setup](docs/stripe-setup.md)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## ✅ Checklist Finale

- [ ] Produits créés dans Stripe Dashboard
- [ ] Price IDs copiés dans `.env.local`
- [ ] Stripe CLI installé et configuré (pour le dev local)
- [ ] Webhook secret ajouté dans `.env.local`
- [ ] Serveur de développement démarré
- [ ] Stripe CLI en cours d'exécution (`stripe listen`)
- [ ] Test effectué avec une carte de test
- [ ] Redirection vers `/checkout/success` fonctionne
- [ ] Subscription créée dans la base de données

Une fois tous ces éléments cochés, votre intégration Stripe est prête ! 🎉


