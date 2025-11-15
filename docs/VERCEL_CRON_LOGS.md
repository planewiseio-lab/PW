# Comment Voir les Logs des Cron Jobs Vercel

## 🔍 Où Trouver les Logs

### 1. Dashboard Vercel (Méthode Principale)

1. **Allez sur le Dashboard Vercel** : https://vercel.com/dashboard
2. **Sélectionnez votre projet** (PlaneWise)
3. **Allez dans l'onglet "Logs"** ou **"Functions"**
4. **Filtrez par fonction** :
   - Cherchez `/api/cron/free-credits` ou `/api/cron/cleanup`
   - Utilisez le filtre de recherche pour trouver `[FREE-CREDITS-CRON]` ou `[CLEANUP-CRON]`

### 2. Onglet "Crons" (Nouveau dans Vercel)

1. Dans votre projet Vercel
2. Allez dans **"Settings"** → **"Crons"**
3. Vous verrez la liste de vos cron jobs configurés
4. Cliquez sur un cron pour voir son historique d'exécution

### 3. Via l'API Vercel (Avancé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Voir les logs
vercel logs --follow
```

## 📊 Format des Logs

Les logs sont maintenant formatés avec des séparateurs visibles :

```
================================================================================
[FREE-CREDITS-CRON] 🚀 STARTING at 2025-01-15T00:00:00.000Z
[FREE-CREDITS-CRON] 📍 Path: /api/cron/free-credits
[FREE-CREDITS-CRON] 🌍 Environment: production
[FREE-CREDITS-CRON] 🔐 Vercel: YES
================================================================================
[FREE-CREDITS-CRON] ✅ Authenticated as Vercel Cron
[CRON] 🕐 Starting FREE credits monthly renewal check...
...
================================================================================
[FREE-CREDITS-CRON] ✅ COMPLETED in 1234ms
[FREE-CREDITS-CRON] 📊 Result: {...}
================================================================================
```

## 🔍 Recherche dans les Logs

### Rechercher par préfixe :

- `[FREE-CREDITS-CRON]` - Logs du cron des crédits gratuits
- `[CLEANUP-CRON]` - Logs du cron de nettoyage
- `[CRON]` - Logs généraux des fonctions cron

### Rechercher par statut :

- `🚀 STARTING` - Démarrage du cron
- `✅ COMPLETED` - Cron terminé avec succès
- `💥 ERROR` - Erreur dans le cron
- `❌` - Échec ou erreur

## ⚠️ Problèmes Courants

### Pas de logs visibles ?

1. **Vérifiez que le cron est bien configuré** :

   - Vérifiez `vercel.json` contient bien les crons
   - Vérifiez que le déploiement est en production

2. **Vérifiez les variables d'environnement** :

   - `CRON_SECRET` doit être défini dans Vercel
   - Allez dans **Settings** → **Environment Variables**

3. **Vérifiez que le cron s'exécute** :

   - Les crons s'exécutent selon le schedule dans `vercel.json`
   - `/api/cron/free-credits` : Tous les jours à 00:00 UTC
   - `/api/cron/cleanup` : Tous les jours à 02:00 UTC

4. **Testez manuellement** :

   ```bash
   # En développement
   curl http://localhost:3000/api/cron/free-credits

   # En production (avec secret)
   curl -X POST https://votre-domaine.com/api/cron/free-credits \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Les logs n'apparaissent pas immédiatement ?

- Les logs peuvent prendre quelques secondes à apparaître
- Utilisez le filtre de temps dans Vercel pour voir les logs récents
- Les logs sont conservés pendant 7 jours (plan gratuit) ou plus (plans payants)

## 📝 Vérification Rapide

Pour vérifier rapidement si vos crons fonctionnent :

1. **Vercel Dashboard** → **Logs**
2. **Recherchez** : `[FREE-CREDITS-CRON]` ou `[CLEANUP-CRON]`
3. **Vérifiez la date/heure** : Les logs doivent correspondre au schedule
4. **Vérifiez le statut** : `✅ COMPLETED` = succès, `💥 ERROR` = erreur

## 🎯 Prochaines Étapes

Si vous ne voyez toujours pas de logs, vérifiez :

- ✅ Le cron est bien déployé en production
- ✅ `CRON_SECRET` est défini dans Vercel
- ✅ Le schedule dans `vercel.json` est correct
- ✅ Les endpoints `/api/cron/*` existent et fonctionnent
