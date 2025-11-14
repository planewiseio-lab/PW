# Configuration Vercel : Déploiement Automatique en Production

Si vous devez toujours "Promote to Production" après chaque déploiement, c'est que Vercel déploie automatiquement en **Preview** au lieu de **Production**. Voici comment corriger cela.

## 🔍 Pourquoi cela arrive ?

Par défaut, Vercel :

- Déploie automatiquement en **Production** uniquement pour la branche configurée comme "Production Branch"
- Déploie en **Preview** pour toutes les autres branches
- Si la branche par défaut n'est pas correctement configurée, tous les déploiements vont en Preview

## ✅ Solution : Configurer la Production Branch

### Étape 1 : Vérifier la branche de production

1. Allez sur **Vercel Dashboard** : https://vercel.com
2. Sélectionnez votre projet **PlaneWise**
3. Allez dans **Settings** → **Git**
4. Vérifiez la section **"Production Branch"**

### Étape 2 : Configurer `main` comme Production Branch

1. Dans **Settings** → **Git** → **Production Branch**
2. Assurez-vous que **`main`** est sélectionné (pas `master`)
3. Si ce n'est pas le cas, sélectionnez **`main`** dans le menu déroulant
4. Cliquez sur **Save**

### Étape 3 : Configurer "Ignored Build Step" (IMPORTANT)

1. Dans **Settings** → **Git**, allez dans la section **"Ignored Build Step"**
2. **Problème actuel** : Si vous voyez "Only build production", cela empêche les builds automatiques
3. **Solution** : Changez le comportement :
   - **Option A (Recommandé)** : Sélectionnez **"Don't ignore any builds"** dans le menu déroulant "Behavior"
   - **Option B** : Si vous voulez garder une commande personnalisée, changez la commande pour :
     ```bash
     exit 1
     ```
     (Cela forcera toujours un build, peu importe l'environnement)
4. Cliquez sur **Save**

### Étape 4 : Vérifier les paramètres de déploiement automatique

1. Toujours dans **Settings** → **Git**
2. Vérifiez que **"Auto-deploy"** est activé pour la branche `main`
3. Si ce n'est pas le cas, activez-le

## 🎯 Résultat attendu

Après cette configuration :

- ✅ Chaque push sur `main` déploiera **automatiquement en Production**
- ✅ Vous n'aurez plus besoin de "Promote to Production"
- ✅ Les autres branches continueront de déployer en Preview

## 🔧 Configuration avancée (optionnel)

### Ignorer certaines branches

Si vous voulez que certaines branches ne se déploient pas automatiquement :

1. **Settings** → **Git** → **Ignored Build Step**
2. Ajoutez une condition pour ignorer certaines branches

Exemple :

```bash
# Ignorer les branches qui commencent par "test"
git diff HEAD^ HEAD --quiet . && echo "No changes" || echo "Changes detected"
```

### Checks avant déploiement

Pour ajouter des vérifications avant le déploiement en production :

1. **Settings** → **Git** → **Deployment Protection**
2. Activez les checks souhaités (ex: tests, linting)

## 📝 Vérification

Pour vérifier que tout fonctionne :

1. Faites un petit changement dans votre code
2. Commitez et poussez sur `main` :
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push
   ```
3. Allez sur Vercel Dashboard → **Deployments**
4. Le nouveau déploiement devrait être automatiquement en **Production** (pas en Preview)

## 🐛 Dépannage

### Le déploiement va toujours en Preview

**Vérifiez :**

1. ✅ La branche `main` est bien la "Production Branch" dans Vercel
2. ✅ Vous poussez bien sur `main` (pas sur une autre branche)
3. ✅ "Auto-deploy" est activé pour `main`
4. ✅ La branche `main` est bien la branche par défaut sur GitHub

**Solution :**

- Vérifiez que vous êtes sur `main` : `git branch`
- Si vous êtes sur une autre branche, basculez : `git checkout main`
- Vérifiez la configuration dans Vercel Settings → Git

### Les déploiements ne se déclenchent pas

**Vérifiez :**

1. ✅ La connexion GitHub est active dans Vercel
2. ✅ Les webhooks GitHub sont configurés
3. ✅ Vous avez les permissions nécessaires sur le dépôt

**Solution :**

- Vérifiez dans GitHub : **Settings** → **Webhooks**
- Vérifiez dans Vercel : **Settings** → **Git** → **Connected Git Repository**

## 📚 Ressources

- [Documentation Vercel : Production Branch](https://vercel.com/docs/projects/git#production-branch)
- [Documentation Vercel : Auto-deploy](https://vercel.com/docs/projects/git#auto-deploy)
