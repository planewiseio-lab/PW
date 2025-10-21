# Account Deletion Setup

Pour que la suppression de compte fonctionne complètement, vous devez configurer la clé de service Supabase.

## Configuration requise

### 1. Clé de service Supabase

Ajoutez la clé de service Supabase à votre fichier `.env.local` :

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Obtenir la clé de service

1. Allez dans votre dashboard Supabase
2. Cliquez sur "Settings" → "API"
3. Copiez la "service_role" key (pas l'anon key)
4. Ajoutez-la à votre `.env.local`

## Fonctionnalités

### ✅ Fonctionnel maintenant

- Confirmation de suppression
- Déconnexion automatique
- Redirection vers la page d'accueil
- Gestion d'erreurs

### 🔧 Avec la clé de service

- Suppression complète du compte utilisateur
- Suppression des données associées
- Processus de suppression sécurisé

### 📧 Sans la clé de service

- Déconnexion de l'utilisateur
- Message demandant de contacter le support
- Session terminée

## Sécurité

- ✅ Vérification de l'authentification
- ✅ Confirmation obligatoire
- ✅ Utilisation de l'API Admin Supabase
- ✅ Gestion d'erreurs robuste

## Test

1. Connectez-vous à votre compte
2. Allez dans Account Settings
3. Cliquez sur "Delete Account"
4. Confirmez la suppression
5. Vérifiez que vous êtes déconnecté et redirigé
