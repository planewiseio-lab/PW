# Cron Job de Nettoyage de Base de Données

## Description

Le cron job `/api/cron/cleanup` nettoie automatiquement les données expirées et anciennes de la base de données pour économiser de l'espace.

## Configuration

### Vercel Cron

Le cron job est configuré dans `vercel.json` pour s'exécuter **quotidiennement à 2h00 UTC** :

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Sécurité

Le cron job vérifie le secret `CRON_SECRET` dans les variables d'environnement :

- **Production** : Définir `CRON_SECRET` dans les variables d'environnement Vercel
- **Développement** : Le secret est optionnel (un avertissement est loggé)

Vercel envoie automatiquement le header `Authorization: Bearer <CRON_SECRET>` lors de l'exécution du cron.

## Données nettoyées

### 1. Cache expiré

- **Tables** : `cache`, `cache_sorted_set`
- **Critère** : `expires_at < NOW()`
- **Fréquence** : Quotidienne

### 2. Requêtes API

- **Table** : `api_requests`
- **Critère** : `created_at < NOW() - INTERVAL '30 days'`
- **Fréquence** : Quotidienne

### 3. Événements d'utilisation

- **Table** : `usage_events`
- **Critère** : `createdAt < NOW() - INTERVAL '30 days'`
- **Fréquence** : Quotidienne

### 4. Tokens Supabase expirés

- **Tables** : `auth.one_time_tokens`, `auth.oauth_authorizations`
- **Critère** :
  - `one_time_tokens`: `created_at < NOW() - INTERVAL '7 days'`
  - `oauth_authorizations`: `expires_at < NOW()` ou `created_at < NOW() - INTERVAL '7 days'`
- **Fréquence** : Quotidienne

### 5. Sessions expirées

- **Table** : `auth.sessions`
- **Critère** : `not_after < NOW()` ou `created_at < NOW() - INTERVAL '30 days'`
- **Fréquence** : Quotidienne

### 6. Refresh tokens expirés

- **Table** : `auth.refresh_tokens`
- **Critère** : `revoked = true` ou `session_id IS NULL AND updated_at < NOW() - INTERVAL '30 days'` ou `updated_at < NOW() - INTERVAL '90 days'`
- **Fréquence** : Quotidienne

## Rapport

Le cron job retourne un rapport détaillé avec :

- Nombre d'entrées supprimées par catégorie
- Erreurs éventuelles
- Durée d'exécution
- Total d'entrées supprimées

### Exemple de réponse

```json
{
  "success": true,
  "message": "Database cleanup completed",
  "report": {
    "timestamp": "2025-01-15T02:00:00.000Z",
    "cache": { "deleted": 1250, "error": null },
    "apiRequests": { "deleted": 3420, "error": null },
    "usageEvents": { "deleted": 1890, "error": null },
    "tokens": { "deleted": 156, "error": null },
    "sessions": { "deleted": 89, "error": null },
    "refreshTokens": { "deleted": 234, "error": null },
    "duration": 1234
  },
  "summary": {
    "totalDeleted": 7039,
    "duration": "1234ms"
  }
}
```

## Test local

Pour tester localement en développement :

```bash
# Via GET (fonctionne en dev uniquement)
curl http://localhost:3000/api/cron/cleanup

# Via POST avec secret
curl -X POST http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Variables d'environnement

### Obligatoire

- `DATABASE_URL` : URL de connexion PostgreSQL
- `CRON_SECRET` : Secret pour sécuriser le cron job (recommandé en production)

### Optionnel

- `NODE_ENV` : Mode d'exécution (`development` permet GET sans secret)

## Monitoring

Les logs sont disponibles dans :

- **Vercel** : Dashboard → Functions → Logs
- **Console** : Logs avec préfixe `[CLEANUP]`

## Notes importantes

⚠️ **Attention** : Les données supprimées sont **définitivement supprimées** et ne peuvent pas être récupérées.

- Les données sont supprimées de manière permanente
- Aucune archive n'est créée
- Le cron job est conçu pour être sûr et ne supprime que les données expirées/anciennes
