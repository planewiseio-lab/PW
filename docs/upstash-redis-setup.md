# Configuration Upstash Redis

Ce guide vous explique comment configurer Upstash Redis pour gérer les quotas des utilisateurs (guests et Free plan).

## Pourquoi Upstash Redis ?

Upstash Redis est utilisé pour :
- Gérer les quotas quotidiens des utilisateurs invités (guests)
- Gérer les quotas quotidiens des utilisateurs Free plan
- Stocker temporairement les compteurs de requêtes avec expiration automatique (TTL 24h)
- Optimiser les performances avec des opérations atomiques

**Note** : Si vous ne configurez pas Upstash Redis, le système utilisera un stockage en mémoire (non persistant) qui ne fonctionne que localement.

## Étape 1 : Créer un compte Upstash

1. Allez sur [https://console.upstash.com/](https://console.upstash.com/)
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec GitHub, Google ou créez un compte email

## Étape 2 : Créer une base de données Redis

1. Dans le dashboard Upstash, cliquez sur **"Create Database"**
2. Configurez votre base de données :
   - **Name** : `planewise-redis` (ou un nom de votre choix)
   - **Type** : **Redis** (pas Kafka)
   - **Region** : Choisissez la région la plus proche de vos serveurs
     - Pour l'Europe : `eu-west-1`, `eu-central-1`
     - Pour l'Amérique : `us-east-1`, `us-west-2`
   - **Plan** : 
     - **Free** : 10,000 commandes/jour (suffisant pour ~2,000 utilisateurs quotidiens)
     - **Pay As You Go** : $0.20 pour 100K commandes (recommandé pour 5,000+ utilisateurs)

3. Cliquez sur **"Create"**

## Étape 3 : Récupérer les credentials

1. Une fois la base créée, cliquez dessus pour voir les détails
2. Dans la section **"REST API"**, vous trouverez :
   - **UPSTASH_REDIS_REST_URL** : URL de l'API REST (ex: `https://xxx-xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** : Token d'authentification

3. Copiez ces deux valeurs

## Étape 4 : Configurer les variables d'environnement

### En développement local :

1. Créez ou modifiez le fichier `.env.local` à la racine du projet
2. Ajoutez les variables suivantes :

```env
UPSTASH_REDIS_REST_URL=https://votre-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=votre_token
```

### En production (Vercel, etc.) :

1. Allez dans les **Settings** de votre projet
2. Section **"Environment Variables"**
3. Ajoutez :
   - `UPSTASH_REDIS_REST_URL` = `https://votre-url.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `votre_token`

## Étape 5 : Redémarrer le serveur

Après avoir ajouté les variables d'environnement :

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez
npm run dev
```

Vous devriez voir dans les logs :
```
✅ Redis client initialized with Upstash
```

## Vérification

Pour vérifier que Redis fonctionne :

1. Faites une requête en tant qu'invité (guest) ou utilisateur Free
2. Vérifiez les logs du serveur - vous devriez voir :
   - `[Guest Quota]` ou `[Free User Quota]` logs
   - Pas de warnings sur Redis

## Plans et limites

### Plan Free Upstash
- ✅ 10,000 commandes/jour
- ✅ 256 MB de mémoire
- ✅ 10 requêtes/seconde
- ❌ **Limite** : ~2,000 utilisateurs quotidiens max

### Plan Pay As You Go
- ✅ $0.20 pour 100K commandes
- ✅ Illimité en mémoire (avec limites de quota)
- ✅ 100 requêtes/seconde
- ✅ **Suffisant pour 5,000+ utilisateurs quotidiens**

**Estimation coût** : ~$4-5/mois pour 5,000 utilisateurs quotidiens

## Dépannage

### Le système utilise le fallback en mémoire

**Symptômes** :
- Logs montrent : `🔧 Using in-memory Redis fallback`
- Les quotas ne persistent pas après redémarrage

**Solutions** :
1. Vérifiez que les variables d'environnement sont bien définies
2. Vérifiez que les credentials sont corrects (pas d'espaces)
3. Redémarrez le serveur après modification

### Erreur "Redis get error" ou "Redis set error"

**Solutions** :
1. Vérifiez que votre base Upstash est active (pas suspendue)
2. Vérifiez que vous n'avez pas dépassé les limites du plan gratuit
3. Vérifiez la région de votre base (doit être proche de vos serveurs)

## Alternative : Sans Redis

Si vous ne souhaitez pas utiliser Upstash Redis :
- Le système fonctionnera avec un stockage en mémoire (fallback)
- ⚠️ **ATTENTION** : Les quotas ne persistent pas après redémarrage du serveur
- ⚠️ Les quotas ne fonctionnent pas en production avec plusieurs instances (load balancing)

**Recommandation** : Utilisez Upstash Redis pour la production.

