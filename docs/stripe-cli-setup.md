# Configuration Stripe CLI pour Webhooks Locaux

Ce guide explique comment installer et configurer Stripe CLI pour recevoir automatiquement les webhooks en développement local.

## Installation Stripe CLI

### Windows

1. **Télécharger Stripe CLI** :

   - Allez sur : https://github.com/stripe/stripe-cli/releases/latest
   - Téléchargez `stripe_X.X.X_windows_x86_64.zip` (ou `stripe_X.X.X_windows_x86_64.tar.gz`)
   - Extrayez l'archive dans un dossier (ex: `C:\stripe-cli\`)

2. **Ajouter au PATH** :

   - Ouvrez les Variables d'environnement Windows
   - Ajoutez le dossier contenant `stripe.exe` au PATH système
   - Ou créez un alias dans PowerShell :
     ```powershell
     # Dans votre profil PowerShell ($PROFILE)
     Set-Alias stripe "C:\stripe-cli\stripe.exe"
     ```

3. **Vérifier l'installation** :
   ```powershell
   stripe --version
   ```

### Alternative : Scoop (Windows Package Manager)

Si vous avez Scoop installé :

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

### macOS

```bash
brew install stripe/stripe-cli/stripe
```

### Linux

```bash
# Download and install
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

## Configuration

### 1. Se connecter à Stripe

```bash
stripe login
```

Cette commande ouvrira votre navigateur pour authentifier la CLI avec votre compte Stripe.

### 2. Obtenir la clé secrète du webhook

Après avoir lancé `stripe listen`, vous recevrez une clé secrète (commence par `whsec_`).

Ajoutez-la à votre `.env.local` :

```env
STRIPE_WEBHOOK_SECRET=whsec_XXXXXX
```

## Utilisation

### Option 1 : Lancer manuellement

Dans un terminal séparé :

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### Option 2 : Utiliser le script npm (automatique)

Nous avons créé un script npm qui lance Stripe CLI avec Next.js :

```bash
npm run dev:with-webhooks
```

Ce script lance automatiquement :

1. Next.js en mode développement
2. Stripe CLI pour écouter les webhooks

### Option 3 : Utiliser concurrently (recommandé)

Le script `dev:with-webhooks` utilise `concurrently` pour lancer les deux processus simultanément.

## Test

Une fois Stripe CLI lancé, testez avec :

```bash
# Simuler un événement de paiement réussi
stripe trigger customer.subscription.created

# Simuler une création de customer
stripe trigger customer.created
```

## Troubleshooting

### Erreur "stripe: command not found"

- Vérifiez que Stripe CLI est dans votre PATH
- Sur Windows, redémarrez le terminal après modification du PATH

### Erreur "webhook signature verification failed"

- Vérifiez que `STRIPE_WEBHOOK_SECRET` dans `.env.local` correspond à la clé affichée par `stripe listen`
- La clé change à chaque fois que vous lancez `stripe listen`, donc mettez-la à jour dans `.env.local`

### Port déjà utilisé

- Changez le port dans la commande : `stripe listen --forward-to http://localhost:3001/api/stripe/webhook`
- Ou arrêtez le processus qui utilise le port

## Avantages

Avec Stripe CLI configuré :

- ✅ Les webhooks sont automatiquement reçus en local
- ✅ Les abonnements sont mis à jour automatiquement
- ✅ Les crédits sont attribués automatiquement
- ✅ Plus besoin de corriger manuellement après chaque paiement test
