# 📍 Emplacements des Publicités - PlaneWise

**Date:** 2025-01-26

---

## 🎯 Page Aircraft (CURRENT)

### Emplacement actuel

**Fichier:** `src/app/aircraft/[reg]/page.tsx`  
**Ligne:** 178  
**Position:** Après la carte d'avion, avant le footer

```tsx
<AircraftCard data={data} />;
{
  /* Publicités pour les utilisateurs guest/subscribed */
}
<AdSection className="mt-8" />;
```

**Rendu visuel:**

```
┌─────────────────────────┐
│   Search Bar            │
├─────────────────────────┤
│                         │
│   [Image principale]    │
│   Carte d'avion         │  ← Contenu principal
│   Spécifications        │
│   Miniatures            │
│                         │
├─────────────────────────┤
│   [PUB DISPLAY]         │  ← ICI (AdSection)
│   728x90 ou 300x250     │
├─────────────────────────┤
│   Footer                │
└─────────────────────────┘
```

**Spécifications:**

- Format: Display (728x90 Desktop, responsive sur mobile)
- Centré horizontalement
- Marges: `mt-8` (2rem en haut)
- Affichage: Seulement pour guest et connectés sans souscription

---

## 🎯 Pages futures (À faire)

### 1. Page Homepage

**Fichier:** `src/app/page.tsx`  
**Emplacement proposé:** Entre SearchCluster et ShowcaseSection

```tsx
<SearchCluster />
<AdSection /> {/* ICI */}
<ShowcaseSection />
```

**Position visuelle:**

```
┌─────────────────────────┐
│   Hero Section          │
│   [Search Bar]          │
├─────────────────────────┤
│   [PUB 728x90]          │  ← ICI
├─────────────────────────┤
│   Showcase Carousel     │
│   Stats Section         │
└─────────────────────────┘
```

---

### 2. Page Flight Details

**Fichier:** `src/app/flight/[flight]/page.tsx`  
**Emplacement proposé:** Après les infos de vol

```tsx
<FlightCard data={data} />
<AdSection /> {/* ICI */}
<AircraftDetails />
```

**Position visuelle:**

```
┌─────────────────────────┐
│   Flight Card           │
│   Route & Status        │
│   Timeline              │
├─────────────────────────┤
│   [PUB DISPLAY]         │  ← ICI
├─────────────────────────┤
│   Aircraft Info         │
│   Altitude & Speed      │
└─────────────────────────┘
```

---

### 3. Page Airport

**Fichier:** `src/app/airport/[icao]/page.tsx`  
**Emplacement proposé:** Entre les stats et les vols récents

```tsx
<AirportStats data={data} />
<AdSection /> {/* ICI */}
<RecentFlights />
```

**Position visuelle:**

```
┌─────────────────────────┐
│   Airport Header        │
│   Coordinates           │
├─────────────────────────┤
│   Stats Grid            │
│   (Delays, Weather)     │
├─────────────────────────┤
│   [PUB DISPLAY]         │  ← ICI
├─────────────────────────┤
│   Recent Flights        │
│   Arrivals/Departures   │
└─────────────────────────┘
```

---

## 📐 Formats Disponibles

### 1. Display (Actuel)

- Desktop: 728x90 (Leaderboard)
- Mobile: 300x250 (Medium Rectangle responsive)
- Utilisation: Pages de détail (aircraft, flight, airport)

### 2. In-Article (À venir)

- Format: Fluid (adaptatif)
- Utilisation: Entre les sections de contenu
- Parfait pour: Articles longs, descriptions détaillées

### 3. Sidebar (À venir)

- Format: 300x250 ou 300x600
- Utilisation: Colonnes latérales
- Parfait pour: Blog, pages de listing

### 4. Compact (Mobile)

- Format: 320x50 (Mobile Banner)
- Utilisation: En haut des pages mobiles
- Parfait pour: Navigation mobile

---

## 🎨 Rendu Visuel Actuel

### Page Aircraft - Version Desktop

```
╔═══════════════════════════════════════╗
║           Search Header                ║
╠═══════════════════════════════════════╣
║                                       ║
║        [Image Principale - 1024px]     ║
║                                       ║
║  ┌─────────────────────────────────┐  ║
║  │ Aircraft Specs                  │  ║
║  │ Registration: D-ABYU           │  ║
║  │ Type: Airbus A320-214           │  ║
║  │ Airline: Lufthansa             │  ║
║  │ ...                             │  ║
║  └─────────────────────────────────┘  ║
║                                       ║
║  [Thumb 1] [Thumb 2] [Thumb 3]       ║
║                                       ║
╠═══════════════════════════════════════╣
║  ┌───────────────────────────────┐  ║
║  │     [PUB GOOGLE ADSENSE]      │  ║ ← ICI
║  │        728 x 90 px            │  ║
║  └───────────────────────────────┘  ║
╠═══════════════════════════════════════╣
║            Footer                     ║
╚═══════════════════════════════════════╝
```

### Page Aircraft - Version Mobile

```
┌─────────────────────┐
│   Search Header     │
├─────────────────────┤
│                     │
│  [Image - Responsive]│
│                     │
│  Aircraft Specs     │
│  Registration       │
│  Type               │
│  ...                │
│                     │
│  [T] [T] [T]        │
│                     │
├─────────────────────┤
│                     │
│  [PUB ADSENSE]      │ ← ICI
│  300x250 resp       │
│                     │
├─────────────────────┤
│   Footer            │
└─────────────────────┘
```

---

## ✅ Résumé

### Actuellement implémenté

- ✅ Page Aircraft (après la carte d'avion)

### À implémenter

- ⏳ Page Homepage (après search)
- ⏳ Page Flight (après flight card)
- ⏳ Page Airport (après stats)

### Emplacements stratégiques

1. **Après le contenu principal** - Max de visibilité sans interruption
2. **Avant le footer** - Dernière chance avant départ
3. **Centré** - Meilleure visibilité sur desktop
4. **Responsive** - Adaptation automatique sur mobile

---

## 🚀 Prochaines Étapes

### Maintenant

1. Les pubs sont activées sur la page aircraft uniquement
2. Affiche automatiquement pour guests et non-subscribed
3. Caché pour les utilisateurs avec souscription active

### Après configuration AdSense

1. Les pubs commenceront à apparaître automatiquement
2. Google optimisera les positions et formats
3. Vous verrez les revenus dans le dashboard AdSense

### Optimisations futures

1. A/B tester les positions
2. Ajouter d'autres emplacements (homepage, flight, airport)
3. Tester différents formats (in-article, sidebar)

---

**Position actuelle:** Une seule pub après la carte d'avion, en bas de la page de détail.
