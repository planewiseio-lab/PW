# Configuration du Stripe Customer Portal

Le Stripe Customer Portal permet aux utilisateurs de gérer leurs abonnements (annuler, modifier, etc.) directement depuis votre application.

## Étape 1 : Activer le Customer Portal dans Stripe Dashboard

### Pour le mode TEST (test mode) :

1. Allez sur : https://dashboard.stripe.com/test/settings/billing/portal
2. Cliquez sur **"Activate test link"** ou **"Activate test link"**
3. Configurez les options suivantes :

   - **Cancellation behavior** : Choisissez si les clients peuvent annuler immédiatement ou à la fin de la période
   - **Cancellation reasons** : Activer les raisons d'annulation (optionnel)
   - **Proration behavior** : Comment gérer les changements de plan
   - **Invoice history** : Autoriser les clients à voir l'historique des factures (recommandé)
   - **Payment method update** : Autoriser les clients à mettre à jour leur méthode de paiement (recommandé)

4. Cliquez sur **"Save changes"** en haut de la page

### Pour le mode LIVE (production) :

1. Allez sur : https://dashboard.stripe.com/settings/billing/portal
2. Répétez les mêmes étapes que pour le mode TEST

## Étape 2 : Vérifier la configuration

Une fois configuré, vous devriez voir :

- ✅ **"Your customer portal is active"** en haut de la page
- Un lien de test que vous pouvez utiliser pour tester

## Étape 3 : Tester dans votre application

1. Connectez-vous avec un utilisateur qui a un abonnement actif
2. Allez sur `/account-settings` → onglet "Subscription"
3. Cliquez sur **"Manage Subscription"**
4. Vous devriez être redirigé vers le Customer Portal Stripe

## Options recommandées

- ✅ **Allow customers to cancel subscriptions** : Activé
- ✅ **Cancellation behavior** : "Cancel at period end" (annuler à la fin de la période)
- ✅ **Show invoice history** : Activé
- ✅ **Allow customers to update payment methods** : Activé

## Dépannage

Si vous voyez encore l'erreur après avoir configuré :

1. Vérifiez que vous êtes dans le bon mode (test vs live)
2. Assurez-vous que votre `STRIPE_SECRET_KEY` correspond au bon mode
3. Attendez quelques secondes après avoir sauvegardé la configuration
4. Rafraîchissez la page et réessayez
