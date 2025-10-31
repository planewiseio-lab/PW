# Fix: Erreur "Cannot read properties of undefined (reading 'findUnique')"

## Problème

Vous obtenez l'erreur `500 Internal Server Error` avec le message "Cannot read properties of undefined (reading 'findUnique')" quand vous essayez d'accéder à `/checkout?plan=pro`.

## Cause

Cette erreur indique que Prisma Client n'est pas correctement initialisé ou que la base de données n'est pas accessible. Cela peut être dû à :

1. **Prisma Client n'a pas été généré** après des modifications du schéma
2. **Variable `DATABASE_URL` manquante** dans `.env.local`
3. **Serveur Next.js bloque** la régénération de Prisma Client

## Solution

### Étape 1 : Arrêter le serveur Next.js

Si votre serveur de développement est en cours d'exécution (`npm run dev`), arrêtez-le avec `Ctrl+C`.

### Étape 2 : Vérifier DATABASE_URL

Assurez-vous que votre fichier `.env.local` contient :

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

> **Note** : Si vous utilisez Supabase, vous pouvez trouver votre DATABASE_URL dans Supabase Dashboard → Settings → Database → Connection String (URI mode).

### Étape 3 : Régénérer Prisma Client

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npx prisma generate
```

Cette commande génère le client Prisma à partir de votre schéma.

### Étape 4 : Vérifier la base de données

Assurez-vous que votre base de données est accessible :

```bash
npx prisma db pull
```

Cela récupère le schéma de votre base de données (optionnel, mais utile pour vérifier la connexion).

### Étape 5 : Redémarrer le serveur

Redémarrez votre serveur de développement :

```bash
npm run dev
```

### Étape 6 : Tester à nouveau

Essayez à nouveau d'accéder à : `http://localhost:3000/checkout?plan=pro`

## Vérifications supplémentaires

### Vérifier que Prisma est correctement configuré

Dans votre terminal serveur, vérifiez qu'il n'y a pas d'erreurs de connexion à la base de données au démarrage.

### Vérifier les logs serveur

Si l'erreur persiste, regardez les logs du serveur Next.js dans votre terminal. L'erreur devrait maintenant être plus claire grâce aux améliorations apportées au code.

### Vérifier les variables d'environnement

Assurez-vous que votre `.env.local` contient **toutes** ces variables :

```bash
# Base de données (OBLIGATOIRE)
DATABASE_URL="postgresql://..."

# Stripe (OBLIGATOIRE pour le checkout)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BASIC=price_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (OBLIGATOIRE pour l'authentification)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Si le problème persiste

1. **Vérifiez la console du navigateur** (F12) pour voir l'erreur exacte
2. **Vérifiez les logs serveur** dans votre terminal
3. **Vérifiez que vous êtes connecté** - l'API Stripe nécessite une authentification
4. **Vérifiez que Prisma Client est généré** :
   ```bash
   ls node_modules/.prisma/client
   ```
   (Sur Windows, utilisez `dir node_modules\.prisma\client`)

## Problèmes courants

### Erreur "EPERM: operation not permitted"

- **Solution** : Arrêtez complètement le serveur Next.js avant de régénérer Prisma

### Erreur "DATABASE_URL is not set"

- **Solution** : Ajoutez `DATABASE_URL` à votre `.env.local` et redémarrez le serveur

### Erreur "Cannot connect to database"

- **Solution** : Vérifiez que votre base de données est accessible et que `DATABASE_URL` est correct

### Erreur "Model 'subscription' does not exist"

- **Solution** : Vérifiez que votre schéma Prisma contient le modèle `subscriptions` et régénérez le client :
  ```bash
  npx prisma generate
  ```

## Support

Si le problème persiste après avoir suivi ces étapes, vérifiez :
- Les logs serveur pour plus de détails
- La console du navigateur pour les erreurs frontend
- Que tous les packages sont à jour : `npm install`


