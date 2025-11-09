# 🚀 Guide pas à pas : Déploiement sur Vercel

## Étape 1 : Préparer et commiter vos changements

### 1.1 Vérifier les fichiers modifiés

```bash
git status
```

### 1.2 Ajouter tous les fichiers modifiés

```bash
git add .
```

### 1.3 Créer un commit

```bash
git commit -m "Préparation pour déploiement Vercel - ajout checklist et améliorations checkout"
```

---

## Étape 2 : Préparer GitHub

### Option A : Si vous avez déjà un repository GitHub

#### 2.1 Ajouter le remote GitHub

```bash
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
```

#### 2.2 Vérifier le remote

```bash
git remote -v
```

#### 2.3 Push vers GitHub

```bash
git push -u origin master
```

### Option B : Si vous devez créer un nouveau repository GitHub

#### 2.1 Créer un nouveau repository sur GitHub

1. Allez sur https://github.com/new
2. Nommez votre repository (ex: `planewise`)
3. Ne cochez PAS "Initialize with README" (vous avez déjà des fichiers)
4. Cliquez sur "Create repository"

#### 2.2 Ajouter le remote et push

```bash
# Remplacez VOTRE_USERNAME et VOTRE_REPO par vos valeurs
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
git branch -M main  # Si GitHub utilise 'main' au lieu de 'master'
git push -u origin main
```

---

## Étape 3 : Connecter votre projet à Vercel

### 3.1 Créer un compte Vercel (si nécessaire)

1. Allez sur https://vercel.com
2. Cliquez sur "Sign Up"
3. Connectez-vous avec GitHub

### 3.2 Importer votre projet

1. Dans le dashboard Vercel, cliquez sur "Add New..." → "Project"
2. Sélectionnez votre repository GitHub (il devrait apparaître dans la liste)
3. Cliquez sur "Import"

### 3.3 Configuration du projet

- **Framework Preset** : Next.js (détecté automatiquement)
- **Root Directory** : `./` (par défaut)
- **Build Command** : `next build` (par défaut)
- **Output Directory** : `.next` (par défaut)
- **Install Command** : `npm install` (par défaut)

⚠️ **NE CLIQUEZ PAS ENCORE SUR "Deploy"** - On doit d'abord configurer les variables d'environnement !

---

## Étape 4 : Configurer les variables d'environnement dans Vercel

### 4.1 Avant de déployer, ajoutez les variables

Dans la page de configuration du projet Vercel, section "Environment Variables", ajoutez :

#### Variables Supabase (OBLIGATOIRES)

```
NEXT_PUBLIC_SUPABASE_URL = votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY = votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY = votre_service_role_key
```

#### Variable Base de données (OBLIGATOIRE)

⚠️ **IMPORTANT pour Supabase + Vercel** : Utilisez le **Connection Pooler** (port **6543**) et non la connexion directe (port 5432) !

```
DATABASE_URL = postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

**Comment obtenir l'URL du pooler :**
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Settings → Database
4. Section "Connection string" → Onglet **"Connection pooling"**
5. Copiez l'URI (elle contient `:6543` et `?pgbouncer=true`)

**Format attendu :**
- ✅ Port **6543** (Connection Pooler) - **RECOMMANDÉ pour Vercel**
- ❌ Port **5432** (Direct connection) - Ne fonctionne PAS avec Vercel/serverless

#### Variables Stripe (OBLIGATOIRES pour les paiements)

```
STRIPE_SECRET_KEY = sk_live_... (ou sk_test_... pour les tests)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_... (ou pk_test_... pour les tests)
STRIPE_WEBHOOK_SECRET = whsec_...
STRIPE_PRICE_ID_BASIC = price_...
STRIPE_PRICE_ID_PRO = price_...
```

#### Variable API Market (OBLIGATOIRE)

```
API_MARKET_KEY = votre_cle_api
```

#### Variables optionnelles

```
USE_SUPABASE_CACHE = true
REDIS_URL = redis://... (optionnel)
```

### 4.2 Important : Sélectionner les environnements

Pour chaque variable, cochez :

- ✅ Production
- ✅ Preview
- ✅ Development (si vous voulez tester en dev)

---

## Étape 5 : Déployer

### 5.1 Lancer le déploiement

1. Cliquez sur "Deploy"
2. Attendez que le build se termine (2-5 minutes)

### 5.2 Vérifier le déploiement

- Si le build réussit, vous verrez "Ready" avec une URL
- Si le build échoue, consultez les logs pour voir l'erreur

---

## Étape 6 : Configurer les webhooks Stripe

### 6.1 Obtenir l'URL de votre webhook

Votre URL sera : `https://votre-projet.vercel.app/api/stripe/webhook`

### 6.2 Configurer dans Stripe Dashboard

1. Allez sur https://dashboard.stripe.com/webhooks
2. Cliquez sur "Add endpoint"
3. Collez l'URL : `https://votre-projet.vercel.app/api/stripe/webhook`
4. Sélectionnez les événements :
   - `customer.created`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copiez le "Signing secret" (commence par `whsec_...`)
6. Retournez dans Vercel et ajoutez cette valeur à `STRIPE_WEBHOOK_SECRET`

### 6.3 Redéployer après avoir ajouté le webhook secret

Dans Vercel, allez dans "Deployments" → Cliquez sur les 3 points → "Redeploy"

---

## Étape 7 : Vérifier que tout fonctionne

### 7.1 Tester l'application

1. Visitez votre URL Vercel
2. Testez l'authentification
3. Testez une recherche d'avion/vol
4. Testez le checkout (en mode test Stripe)

### 7.2 Vérifier les crons

Les crons sont configurés dans `vercel.json` :

- `/api/cron/free-credits` - Tous les jours à minuit
- `/api/cron/cleanup` - Tous les jours à 2h

Ils devraient s'exécuter automatiquement.

### 7.3 Vérifier les logs

Dans Vercel Dashboard → "Logs", vérifiez qu'il n'y a pas d'erreurs.

---

## 🔧 Dépannage

### Erreur : "Missing environment variables"

→ Vérifiez que toutes les variables obligatoires sont configurées dans Vercel

### Erreur : "Prisma client not generated"

→ Vercel génère automatiquement Prisma, mais vérifiez que `DATABASE_URL` est correct

### Erreur : "Build failed"

→ Consultez les logs dans Vercel pour voir l'erreur exacte

### Webhook Stripe ne fonctionne pas

→ Vérifiez que l'URL du webhook dans Stripe correspond à votre domaine Vercel
→ Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct

---

## 📝 Checklist finale

- [ ] Code commité et pushé sur GitHub
- [ ] Projet connecté à Vercel
- [ ] Toutes les variables d'environnement configurées
- [ ] Premier déploiement réussi
- [ ] Webhook Stripe configuré
- [ ] Application testée et fonctionnelle
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🎉 Félicitations !

Votre application est maintenant déployée sur Vercel !

Chaque push sur votre branche principale déclenchera automatiquement un nouveau déploiement.
