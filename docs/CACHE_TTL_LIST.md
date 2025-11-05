# Liste des Temps de Cache pour les Requêtes API AeroDataBox

## 📋 Vue d'ensemble

Cette liste répertorie tous les temps de cache (TTL) pour chaque requête API AeroDataBox dans le système.

---

## 🔧 Services ADB (`src/services/abdClient.ts`)

### 1. `getAirport(code)` - Informations d'aéroport
- **TTL par défaut**: **3600 secondes (1 heure)**
- **Fichier**: `src/services/abdClient.ts:125`
- **Cache**: Redis/Supabase (via `cachedJson`)
- **Utilisé dans**: `/api/airport/[code]?info=true`

### 2. `getFlightsRelativeBoth(code, beforeHours, afterHours)` - Départs + Arrivées
- **TTL par défaut**: **900 secondes (15 minutes)**
- **Fichier**: `src/services/abdClient.ts:147`
- **Cache**: Redis/Supabase (via `cachedJson`)
- **Utilisé dans**: `/api/airport/[code]` (pour récupérer les deux directions en un seul appel)

### 3. `getFlightsRelative(code, direction, beforeHours, afterHours)` - Départs OU Arrivées
- **TTL par défaut**: **60 secondes (1 minute)**
- **Fichier**: `src/services/abdClient.ts:171`
- **Cache**: Redis/Supabase (via `cachedJson`)
- **Note**: Peu utilisé, `getFlightsRelativeBoth` est préféré

### 4. `getHistory(reg, fromDate, toDate)` - Historique des vols d'un avion
- **TTL par défaut**: **60 secondes (1 minute)**
- **Fichier**: `src/services/abdClient.ts:204`
- **Cache**: Redis/Supabase (via `cachedJson`)
- **Utilisé dans**: `/api/aircraft/[reg]/history` (via AeroDataBox)

---

## 🌐 Routes API Next.js

### 5. `/api/aircraft/[reg]` - Informations d'un avion
- **TTL Supabase**: **86400 secondes (24 heures)**
- **Fichier**: `src/app/api/aircraft/[reg]/route.ts:18`
- **Cache**: Supabase PostgreSQL
- **Header Cache-Control**: Non défini (pas de header HTTP)

### 6. `/api/aircraft/[reg]/flights` - Liste des vols d'un avion (7 jours)
- **TTL Supabase**: **21600 secondes (6 heures)**
- **Fichier**: `src/app/api/aircraft/[reg]/flights/route.ts:11`
- **Cache**: Supabase PostgreSQL
- **Header Cache-Control**: `max-age=21600, s-maxage=21600` (6 heures)
- **Note**: Utilise `FLIGHTS_TTL_SECONDS`

### 7. `/api/aircraft/[reg]/history` - Historique des vols d'un avion
- **TTL Supabase**: **3600 secondes (1 heure)**
- **Fichier**: `src/app/api/aircraft/[reg]/history/route.ts:11`
- **Cache**: Supabase PostgreSQL ✅ **Partagé entre instances serverless**
- **Header Cache-Control**: `max-age=3600, s-maxage=3600` (1 heure)
- **Note**: ✅ Migré vers Supabase pour la persistance

### 8. `/api/flights/[flight]` - Informations d'un vol spécifique
- **TTL Supabase (adaptatif)**:
  - **Vols historiques**: **1800 secondes (30 minutes)**
  - **Vols futurs**: **600 secondes (10 minutes)**
- **Fichier**: `src/app/api/flights/[flight]/route.ts:554`
- **Cache**: Supabase PostgreSQL
- **Header Cache-Control**:
  - **Cache HIT**: `max-age=600, s-maxage=600` (10 minutes)
  - **Cache MISS**: `max-age=${ttlSeconds}, s-maxage=${ttlSeconds}` (adaptatif: 10-30 min)

### 9. `/api/airport/[code]` - Vols d'un aéroport (départs/arrivées)
- **TTL Supabase (vols normalisés)**: **900 secondes (15 minutes)**
- **Fichier**: `src/app/api/airport/[code]/route.ts:86`
- **Cache**: Supabase PostgreSQL (vols normalisés)
- **Header Cache-Control**: `max-age=900, s-maxage=900, stale-while-revalidate=1800` (15 minutes)
- **Note**: Utilise `NORMALIZED_CACHE_TTL_SECONDS`

### 10. `/api/airport/[code]?info=true` - Informations d'un aéroport
- **TTL Supabase**: **3600 secondes (1 heure)** (via `getAirport`)
- **Fichier**: `src/app/api/airport/[code]/route.ts:194`
- **Cache**: Redis/Supabase (via `getAirport`)
- **Header Cache-Control**: `s-maxage=3600, stale-while-revalidate=1800` (1 heure)

---

## 📊 Résumé par Type de Données

| Type de Données | TTL Actuel | Cache | Fichier |
|----------------|------------|-------|---------|
| **Informations avion** | 24h | Supabase | `aircraft/[reg]/route.ts` |
| **Vols d'un avion (7j)** | 6h | Supabase | `aircraft/[reg]/flights/route.ts` |
| **Historique vols avion** | 1h | Supabase ✅ | `aircraft/[reg]/history/route.ts` |
| **Vol individuel (historique)** | 30min | Supabase | `flights/[flight]/route.ts` |
| **Vol individuel (futur)** | 10min | Supabase | `flights/[flight]/route.ts` |
| **Vols d'aéroport** | 15min | Supabase | `airport/[code]/route.ts` |
| **Infos aéroport** | 1h | Redis/Supabase | `airport/[code]/route.ts` |

---

## ⚠️ Notes Importantes

1. ~~**Cache en mémoire** : `/api/aircraft/[reg]/history` utilise un cache en mémoire (`Map`) qui n'est **pas partagé** entre les instances serverless. Les données ne persistent pas entre redémarrages.~~ ✅ **Migré vers Supabase**

2. **TTL adaptatif** : `/api/flights/[flight]` utilise un TTL adaptatif selon si le vol est historique ou futur.

3. **Double cache** : Certaines routes utilisent à la fois le cache Redis/Supabase (via `abdClient.ts`) ET le cache Supabase (via routes API).

4. **Headers HTTP** : Les headers `Cache-Control` sont utilisés pour le cache côté navigateur/CDN, mais le cache principal est côté serveur (Supabase).

---

## 🔄 Cache Stack

1. **Client (Redis/Supabase)** : `abdClient.ts` → Cache brut des réponses AeroDataBox
2. **API (Supabase)** : Routes API → Cache des données normalisées/formattées
3. **HTTP (CDN/Browser)** : Headers `Cache-Control` → Cache côté client

---

## 📝 Modifications à Faire

Indiquez quels TTL vous souhaitez modifier et je les appliquerai.

