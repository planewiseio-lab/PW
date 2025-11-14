# Guide de Déploiement sur GitHub

Ce guide explique comment déployer votre projet PlaneWise sur GitHub.

## 📋 Prérequis

1. Un compte GitHub
2. Git installé sur votre machine
3. Le projet initialisé avec Git

## 🚀 Étapes de déploiement

### Étape 1 : Vérifier l'état Git

```bash
git status
```

Vérifiez que vous êtes dans le bon répertoire et que Git est initialisé.

### Étape 2 : Ajouter tous les fichiers

```bash
git add .
```

⚠️ **Important :** Les fichiers `.env.local` et autres fichiers sensibles sont automatiquement ignorés grâce à `.gitignore`.

### Étape 3 : Créer le premier commit

```bash
git commit -m "Initial commit: PlaneWise application"
```

### Étape 4 : Créer un dépôt sur GitHub

1. Allez sur https://github.com/new
2. Remplissez les informations :
   - **Repository name** : `plane-wise` (ou le nom de votre choix)
   - **Description** : "Professional Aviation Data Platform"
   - **Visibility** : Public ou Private (selon votre préférence)
   - **NE COCHEZ PAS** "Initialize this repository with a README" (le projet existe déjà)
3. Cliquez sur **"Create repository"**

### Étape 5 : Lier le dépôt local à GitHub

GitHub vous donnera des commandes. Utilisez celles-ci :

```bash
git remote add origin https://github.com/VOTRE_USERNAME/plane-wise.git
```

Remplacez `VOTRE_USERNAME` par votre nom d'utilisateur GitHub.

### Étape 6 : Pousser le code sur GitHub

```bash
git branch -M main
git push -u origin main
```

Si vous êtes sur la branche `master` au lieu de `main` :

```bash
git branch -M master
git push -u origin master
```

### Étape 7 : Vérifier

1. Allez sur votre dépôt GitHub : `https://github.com/VOTRE_USERNAME/plane-wise`
2. Vérifiez que tous les fichiers sont présents
3. Vérifiez que `.env.local` n'est **PAS** présent (pour la sécurité)

## 🔒 Sécurité - Variables d'environnement

⚠️ **IMPORTANT :** Ne jamais commiter les fichiers `.env.local` ou contenant des clés API !

Les fichiers suivants sont automatiquement ignorés grâce à `.gitignore` :
- `.env.local`
- `.env`
- `node_modules/`
- `.next/`
- `.vercel/`

### Variables à configurer sur Vercel/GitHub Actions

Pour la production, configurez ces variables dans votre plateforme de déploiement :

- `RESEND_API_KEY`
- `CONTACT_EMAIL`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Et toutes les autres variables d'environnement nécessaires

## 📝 Commandes rapides

### Pour les prochains déploiements

```bash
# Ajouter les changements
git add .

# Créer un commit
git commit -m "Description des changements"

# Pousser sur GitHub
git push
```

### Créer une nouvelle branche

```bash
git checkout -b nom-de-la-branche
git push -u origin nom-de-la-branche
```

### Voir l'historique

```bash
git log --oneline
```

## 🔗 Intégration avec Vercel

Si vous déployez sur Vercel :

1. Allez sur https://vercel.com
2. Cliquez sur **"New Project"**
3. Importez votre dépôt GitHub
4. Vercel détectera automatiquement Next.js
5. Configurez les variables d'environnement
6. Cliquez sur **"Deploy"**

Vercel se connectera automatiquement à GitHub et déploiera à chaque push.

## 📚 Ressources

- [Documentation GitHub](https://docs.github.com)
- [Documentation Git](https://git-scm.com/doc)
- [Documentation Vercel](https://vercel.com/docs)

