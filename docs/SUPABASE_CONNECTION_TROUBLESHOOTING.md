# Guide de dépannage : Connexion Supabase avec Vercel

## Problème actuel

Prisma essaie de se connecter au port **6543** (Connection Pooler) mais ne peut pas atteindre le serveur :
```
Can't reach database server at `db.ssqqbcniphbdjttxgcug.supabase.co:6543`
```

## Causes possibles

### 1. Restrictions réseau dans Supabase (PROBABLE)

Supabase peut avoir des restrictions IP qui bloquent les connexions depuis Vercel.

**Solution :**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Settings** → **Database**
4. Section **"Network Restrictions"**
5. Vérifiez si des restrictions sont activées :
   - Si **"Restrict all access"** est activé → **Désactivez-le**
   - Si des plages IP spécifiques sont définies → **Ajoutez `0.0.0.0/0`** pour autoriser toutes les IPs (ou supprimez les restrictions)
   - **Important** : Vercel utilise des IPs dynamiques, donc il faut autoriser toutes les IPs ou utiliser le Connection Pooler

### 2. Connection Pooler non activé

Vérifiez que le Connection Pooler est bien activé :

1. **Settings** → **Database**
2. Section **"Connection pooling configuration"**
3. Vérifiez que **"Shared Pooler"** est activé
4. Le **Pool Size** devrait être au moins 15

### 3. URL de connexion incorrecte

Vérifiez que votre `DATABASE_URL` dans Vercel contient :
- ✅ Port **6543** (Connection Pooler)
- ✅ Paramètre `?pgbouncer=true`
- ✅ Format : `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true`

### 4. Mot de passe incorrect

Vérifiez que le mot de passe dans `DATABASE_URL` correspond au mot de passe de la base de données Supabase.

## Vérification rapide

1. **Dans Supabase Dashboard** :
   - Settings → Database → Network Restrictions
   - Assurez-vous qu'**aucune restriction** n'est active (ou que `0.0.0.0/0` est autorisé)

2. **Dans Vercel** :
   - Settings → Environment Variables
   - Vérifiez que `DATABASE_URL` contient bien le port **6543** et `?pgbouncer=true`

3. **Redéployez** :
   - Après avoir modifié les restrictions réseau, redéployez votre application sur Vercel

## Test de connexion

Si vous avez accès à un terminal avec accès réseau à Supabase, vous pouvez tester la connexion :

```bash
psql "postgresql://postgres:[PASSWORD]@db.ssqqbcniphbdjttxgcug.supabase.co:6543/postgres?pgbouncer=true"
```

Si cette commande échoue, le problème vient de Supabase (restrictions réseau ou pooler non activé).

## Solution alternative (temporaire)

Si le Connection Pooler ne fonctionne toujours pas, vous pouvez temporairement utiliser la connexion directe (port 5432) **UNIQUEMENT pour tester** :

⚠️ **ATTENTION** : La connexion directe (port 5432) ne fonctionne généralement **PAS** avec Vercel en production car elle nécessite des connexions persistantes. Utilisez-la uniquement pour tester.

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.ssqqbcniphbdjttxgcug.supabase.co:5432/postgres
```

Mais **revenez au port 6543** dès que possible pour la production.

