# Mode Test - Restriction d'Accès

Ce système permet de restreindre l'accès à votre site pendant la phase de test, tout en permettant aux testeurs autorisés d'y accéder.

## 🚀 Activation du Mode Test

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` ou dans les variables d'environnement Vercel :

```env
# Activer le mode test (true/false)
TEST_MODE=true

# Token d'accès pour les testeurs (changez-le pour la sécurité)
TEST_ACCESS_TOKEN=votre-token-secret-ici

# (Optionnel) Liste d'emails autorisés (séparés par des virgules)
AUTHORIZED_EMAILS=testeur1@example.com,testeur2@example.com
```

### 2. Déploiement

Après avoir configuré les variables d'environnement, déployez votre application. Le mode test sera automatiquement activé.

## 🔐 Comment ça fonctionne

1. **Activation** : Quand `TEST_MODE=true`, tous les visiteurs sont redirigés vers `/maintenance`
2. **Accès autorisé** : Les utilisateurs avec un token valide peuvent accéder au site
3. **Token** : Le token est stocké dans un cookie pour la session (24h)

## 👥 Donner l'accès aux testeurs

### Option 1 : Token simple (recommandé pour les tests Paddle)

Donnez simplement le token aux testeurs :

```
Token: votre-token-secret-ici
```

Ils peuvent :

- Aller sur `https://votre-domaine.com/maintenance?token=votre-token-secret-ici`
- Ou entrer le token manuellement sur la page de maintenance

### Option 2 : Whitelist d'emails (plus sécurisé)

1. Configurez `AUTHORIZED_EMAILS` avec les emails des testeurs
2. Les testeurs doivent :
   - Se connecter avec leur email autorisé
   - Entrer le token sur la page de maintenance

## 🛠️ Routes autorisées en mode test

Même en mode test, ces routes restent accessibles :

- `/maintenance` - Page de maintenance
- `/api/test-access` - API de vérification du token
- `/api/health` - Health check
- `/api/metrics` - Métriques

## 🔄 Désactiver le mode test

Pour rendre le site public, il suffit de :

1. **Méthode 1** : Retirer la variable `TEST_MODE` ou la mettre à `false`
2. **Méthode 2** : Dans Vercel, aller dans Settings > Environment Variables et supprimer/modifier `TEST_MODE`

Après le redéploiement, le site sera accessible à tous.

## 🔒 Sécurité

- **Changez le token par défaut** : Le token par défaut `test-paddle-2024` est public dans le code
- **Utilisez un token fort** : Générez un token aléatoire et sécurisé
- **Whitelist d'emails** : Pour plus de sécurité, utilisez `AUTHORIZED_EMAILS`
- **Token dans l'URL** : Évitez de partager le token dans des URLs publiques (utilisez plutôt la page de maintenance)

## 📝 Exemple de token sécurisé

Générez un token aléatoire :

```bash
# Linux/Mac
openssl rand -hex 32

# Ou utilisez un générateur en ligne
```

## ⚠️ Important

- Le mode test bloque **tous** les visiteurs non autorisés
- Les testeurs doivent avoir le token pour accéder
- Le cookie du token expire après 24h
- Pensez à désactiver le mode test avant le lancement public !
