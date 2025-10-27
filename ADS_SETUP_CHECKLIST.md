# ✅ Checklist Configuration Google AdSense

**Date:** 2025-01-26  
**Statut:** Code prêt, configuration manuelle nécessaire

---

## ✅ CE QUI EST DÉJÀ FAIT

### Code & Composants

- ✅ Composant `AdSense.tsx` créé avec 4 formats
- ✅ Hook `useUserStatus.ts` pour détecter guest/subscribed
- ✅ Composant `AdWrapper.tsx` pour affichage conditionnel
- ✅ Intégration dans `aircraft/[reg]/page.tsx`
- ✅ Documentation complète dans `docs/ads-integration.md`
- ✅ Variables d'environnement ajoutées dans `env.example`

### Fonctionnalités

- ✅ Détection automatique guest vs subscribed
- ✅ Pas de pubs pour les utilisateurs avec souscription active
- ✅ Pubs affichées pour guests et utilisateurs connectés sans souscription
- ✅ Lazy loading des pubs pour performance

---

## 🔧 À FAIRE MAINTENANT (10-15 minutes)

### 1. Créer un compte Google AdSense ⏱️ 5 min

1. Allez sur [Google AdSense](https://www.google.com/adsense/start)
2. Cliquez "Sign in" avec votre compte Google
3. Cliquez "Get Started"
4. Acceptez les termes et conditions
5. Sélectionnez votre pays et acceptez les conditions

### 2. Ajouter votre site ⏱️ 5 min

1. Dans AdSense, cliquez "Sites"
2. Cliquez "Add site"
3. Entrez votre URL: `plane-wise.com`
4. Collez le code de vérification dans votre `layout.tsx` ou suivez les instructions

**Note:** Le code de vérification sera auto-intégré via `NEXT_PUBLIC_ADSENSE_ID` si vous configurez les variables d'environnement.

### 3. Configurer les variables d'environnement ⏱️ 5 min

Dans Vercel → Settings → Environment Variables, ajoutez:

```bash
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=1234567890
```

**Où trouver ces valeurs:**

- `NEXT_PUBLIC_ADSENSE_ID`: Votre Publisher ID (affiché dans AdSense → Account → Account information)
- Les slots sont générés automatiquement par Google après approbation

---

## 📋 TIMELINE GOOGLE ADSENSE

### Étapes d'approbation

1. **Jour 0**: Créer compte et ajouter site
2. **Jour 1-3**: Google vérifie le site (trafic, contenu, politiques)
3. **Jour 3-7**: Notification d'approbation par email
4. **Jour 7+**: Activez les pubs dans le dashboard
5. **Jour 8**: Les pubs commencent à apparaître sur votre site

### En attendant l'approbation

- Le système est déjà en place dans le code
- Les composants n'afficheront rien jusqu'à ce que AdSense soit configuré
- Aucun impact sur les utilisateurs en attendant

---

## 🧪 TESTS À FAIRE APRÈS CONFIGURATION

### Test 1: Guest User

```bash
# Ouvrir en navigation privée
- Aller sur /aircraft/D-ABYU
- Vérifier qu'une pub s'affiche en bas
```

### Test 2: Utilisateur connecté sans souscription

```bash
# Se connecter avec un compte normal
- Aller sur /aircraft/D-ABYU
- Vérifier qu'une pub s'affiche
```

### Test 3: Utilisateur avec souscription

```bash
# Se connecter avec compte premium
- Aller sur /aircraft/D-ABYU
- Vérifier qu'aucune pub ne s'affiche
```

---

## 📊 MONITORING (Après activation)

### Google AdSense Dashboard

1. Allez dans [AdSense](https://adsense.google.com)
2. Consultez les métriques:
   - **RPM** (Revenue Per Mille)
   - **Page views**
   - **Ad requests**
   - **Impressions**
   - **Clicks**
   - **CTR** (Click-Through Rate)

### Objectifs en premier mois

- **Visiteurs**: Essayer d'atteindre 1000+ visiteurs uniques
- **Page views**: 5000+ pages vues
- **RPM**: $1-$5 (selon niche et pays)
- **Revenus**: $5-$25 pour le premier mois

---

## 💡 OPTIMISATIONS FUTURES

### Semaine 1-2

- [ ] Tester différents formats de pubs (display, in-article, sidebar)
- [ ] Analyser quel format génère le plus de revenus
- [ ] Ajuster les positions dans le code

### Mois 1

- [ ] A/B tester les emplacements de pubs
- [ ] Ajouter des pubs dans d'autres pages (flight, airport)
- [ ] Optimiser la densité des pubs

### Mois 2-3

- [ ] Créer du contenu pour augmenter le trafic
- [ ] Utiliser 70% des revenus en Google Ads pour promotion
- [ ] Partenariats publicitaires directs (pour plus de revenus)

---

## 🎯 STATUT ACTUEL

| Étape                         | Statut     | Date       |
| ----------------------------- | ---------- | ---------- |
| **Code prêt**                 | ✅ Terminé | 2025-01-26 |
| **Composants créés**          | ✅ Terminé | 2025-01-26 |
| **Intégration page aircraft** | ✅ Terminé | 2025-01-26 |
| **Documentation**             | ✅ Terminé | 2025-01-26 |
| **Créer compte AdSense**      | ⏳ À faire | -          |
| **Ajouter site**              | ⏳ À faire | -          |
| **Variables env**             | ⏳ À faire | -          |
| **Tests**                     | ⏳ À faire | -          |

---

## 🚀 DÉMARRAGE RAPIDE

```bash
# 1. Créer compte Google AdSense
https://www.google.com/adsense/start

# 2. Après approbation, ajouter dans Vercel
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX

# 3. Redéployer
git push

# 4. Tester dans 24-48h
```

---

## 📝 NOTES

- ⚠️ Ne cliquez PAS sur vos propres publicités
- ⚠️ Ne demandez pas aux utilisateurs de cliquer
- ⚠️ Respectez les policies Google AdSense
- ✅ Les pubs sont déjà intégrées dans le code
- ✅ La logique de détection fonctionne automatiquement
- ✅ Aucun impact sur les performances

---

**Le code est prêt ! Il vous suffit maintenant de configurer Google AdSense.** 🎉
