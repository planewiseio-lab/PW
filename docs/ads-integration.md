# 🎯 Guide d'Intégration Google AdSense - PlaneWise

**Date:** 2025-01-26  
**Version:** 1.0

---

## 📋 Vue d'Ensemble

Le système de publicités Google AdSense est maintenant intégré avec une logique intelligente qui:

1. ✅ **Affiche les pubs pour les utilisateurs GUEST** (non-connectés)
2. ✅ **Affiche les pubs pour les utilisateurs CONNECTÉS SANS souscription active**
3. ❌ **N'affiche PAS les pubs pour les utilisateurs AVEC souscription active** (premium)

---

## 🏗️ Architecture

### Composants Créés

#### 1. `src/components/ads/AdSense.tsx`

Composant principal Google AdSense avec plusieurs formats:

- `AdSense` - Composant de base personnalisable
- `AdUnitDisplay` - Publicité display standard (728x90, 300x250)
- `AdUnitInArticle` - Publicité in-article pour le contenu
- `AdUnitSidebar` - Publicité pour sidebar
- `AdUnitCompact` - Publicité compacte pour mobile

#### 2. `src/components/ads/AdWrapper.tsx`

Wrapper intelligent qui gère l'affichage conditionnel:

- `AdWrapper` - Wrapper général avec détection automatique
- `AdSection` - Section de publicité prête à l'emploi

#### 3. `src/hooks/useUserStatus.ts`

Hook React pour détecter le statut de l'utilisateur:

- `status`: "guest" | "subscribed" | "loading"
- `user`: Objet utilisateur Supabase
- `isAuthenticated`: Boolean
- `shouldShowAds`: Boolean (LOGIQUE CONDITIONNELLE)

---

## ⚙️ Configuration

### 1. Environment Variables

Ajoutez dans votre `.env` ou Vercel:

```bash
# Google AdSense
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX

# Slots de publicités (optionnel, si différents formats)
NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=1234567890
NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT=0987654321
NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT=1122334455
NEXT_PUBLIC_ADSENSE_COMPACT_SLOT=5566778899
```

### 2. Obtenir un Google AdSense ID

1. Allez sur [Google AdSense](https://www.google.com/adsense)
2. Créez un compte ou connectez-vous
3. Ajoutez votre site `plane-wise.com`
4. Obtenez votre Publisher ID (format: `ca-pub-XXXXXXXXXX`)
5. Ajoutez-le dans les variables d'environnement

---

## 📍 Utilisation

### Page de Détail Aircraft (Exemple)

```tsx
import { AdSection } from "@/components/ads/AdWrapper";

export default function AircraftDetailPage() {
  return (
    <main>
      {/* Contenu principal */}
      <AircraftCard data={data} />

      {/* Publicité affichée automatiquement pour guest/subscribed */}
      <AdSection className="mt-8" />
    </main>
  );
}
```

### Dans n'importe quel composant

```tsx
import { useUserStatus } from "@/hooks/useUserStatus";

function MyComponent() {
  const { shouldShowAds, status } = useUserStatus();

  return (
    <div>
      {/* Contenu */}

      {shouldShowAds && <AdSection />}
    </div>
  );
}
```

### Publicité intégrée dans le contenu

```tsx
import { AdWrapper } from "@/components/ads/AdWrapper";

function ArticleContent() {
  return (
    <article>
      <h2>Section 1</h2>
      <p>Contenu...</p>

      <AdWrapper type="in-article">
        {/* Pub s'affiche ici pour guest/subscribed */}
      </AdWrapper>

      <h2>Section 2</h2>
      <p>Plus de contenu...</p>
    </article>
  );
}
```

---

## 🎯 Logique de Détection

La logique dans `useUserStatus` fonctionne ainsi:

```typescript
// 1. Vérifier si l'utilisateur est connecté
const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  // 2. Vérifier s'il a une souscription ACTIVE
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("status, plan")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (subscription && subscription.status === "active") {
    // Utilisateur avec souscription = PAS DE PUBS
    return { shouldShowAds: false };
  } else {
    // Utilisateur connecté sans souscription = AFFICHE PUBS
    return { shouldShowAds: true };
  }
} else {
  // Utilisateur guest = AFFICHE PUBS
  return { shouldShowAds: true };
}
```

**Résultat:**

- Guest → ✅ Pubs affichées
- Connecté sans souscription → ✅ Pubs affichées
- Connecté avec souscription active → ❌ PAS de pubs

---

## 🔧 Intégration Dans d'Autres Pages

### Page Homepage

```tsx
// src/app/page.tsx
import { AdSection } from "@/components/ads/AdWrapper";

export default function HomePage() {
  return (
    <div>
      <SearchCluster />
      <AdSection /> {/* Entre le search et le contenu */}
      <ShowcaseSection />
    </div>
  );
}
```

### Page Flight

```tsx
// src/app/flight/[flight]/page.tsx
import { AdSection } from "@/components/ads/AdWrapper";

export default function FlightDetailPage() {
  return (
    <main>
      <FlightCard data={data} />
      <AdSection /> {/* Sous les infos de vol */}
    </main>
  );
}
```

### Page Airport

```tsx
// src/app/airport/[icao]/page.tsx
import { AdSection } from "@/components/ads/AdWrapper";

export default function AirportDetailPage() {
  return (
    <main>
      <AirportCard data={data} />
      <AdSection /> {/* Entre les stats et les vols */}
    </main>
  );
}
```

---

## ✅ Checklist de Déploiement

### Avant de déployer

- [x] Composants AdSense créés
- [x] Hook `useUserStatus` créé
- [x] Logique de détection implémentée
- [x] Intégration dans `aircraft/[reg]/page.tsx`
- [ ] Ajouter variables d'environnement dans Vercel
- [ ] Obtenir Google AdSense Publisher ID
- [ ] Tester avec différents statuts d'utilisateur

### Dans Vercel (5 minutes)

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez:
   ```
   NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=1234567890
   ```
3. Redéployez

### Tests (10 minutes)

1. **Test Guest** (non-connecté)

   - Ouvrir la page en navigation privée
   - Vérifier que les pubs s'affichent

2. **Test Connecté Sans Souscription**

   - Se connecter
   - Vérifier que les pubs s'affichent

3. **Test Connecté Avec Souscription**
   - Créer/activer une souscription
   - Vérifier que les pubs ne s'affichent PAS

---

## 📊 Monitoring

### Google AdSense Dashboard

- Consulter les stats quotidiennes
- Vérifier les revenus
- Analyser les impressions vs clics
- Ajuster les formats si nécessaire

### Analytics Personnalisés

Vous pouvez ajouter un tracking personnalisé:

```typescript
// Dans AdWrapper
useEffect(() => {
  if (shouldShowAds) {
    // Track ad display
    gtag("event", "ad_displayed", {
      user_status: status,
      page: window.location.pathname,
    });
  }
}, [shouldShowAds, status]);
```

---

## 🚀 Prochaines Étapes

### Court Terme (Semaine 1)

- [ ] Intégrer les pubs dans toutes les pages principales
- [ ] Configurer Google AdSense
- [ ] Tester avec différents formats

### Moyen Terme (Mois 1)

- [ ] A/B tester les positions de pubs
- [ ] Optimiser le CTR (Click-Through Rate)
- [ ] Ajouter des pubs dans les pages secondaires

### Long Terme (Mois 2-3)

- [ ] Dépenser 70% des revenus en Google Ads pour du SEO
- [ ] Optimiser les placements selon les statistiques
- [ ] Créer des partenariats publicitaires directs

---

## 📝 Notes Importantes

### Respect de Google AdSense

- ✅ Ne pas cliquer sur vos propres publicités
- ✅ Ne pas inciter les utilisateurs à cliquer
- ✅ Respecter le consentement RGPD (cookies)
- ✅ Ne pas placer plus de 3 unités par page

### Performance

- Les pubs sont chargées en lazy loading
- N'impactent pas le score Core Web Vitals si bien placées
- Utilisez `Script` de Next.js pour optimiser

---

## 🎉 Résultat

Après cette intégration, votre site:

- ✅ Génère des revenus passifs avec les pubs
- ✅ Offre une expérience premium pour les abonnés (sans pubs)
- ✅ Maintient une expérience acceptable pour les guests
- ✅ Respecte les politiques Google AdSense

**Bon monétisation !** 💰
