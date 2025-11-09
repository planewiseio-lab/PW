# Configuration Google AdSense pour PlaneWise

## Variables d'environnement requises

Pour que les publicités AdSense s'affichent, vous devez configurer les variables d'environnement suivantes dans **Vercel** :

### Variables obligatoires

1. **`NEXT_PUBLIC_ADSENSE_ID`** (obligatoire)
   - Format : `ca-pub-XXXXXXXXXX`
   - Votre ID de compte AdSense (trouvable dans AdSense Dashboard → Account → Account information)

### Variables optionnelles (pour différents formats de publicités)

2. **`NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT`** (recommandé)
   - Format : `1234567890`
   - ID du format de publicité display (728x90 Desktop / Responsive Mobile)
   - Utilisé pour les publicités dans `AdSection` et `AdUnitDisplay`

3. **`NEXT_PUBLIC_ADSENSE_IN_ARTICLE_SLOT`** (optionnel)
   - Format : `1234567890`
   - ID du format de publicité in-article
   - Utilisé pour les publicités dans les pages de contenu

4. **`NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT`** (optionnel)
   - Format : `1234567890`
   - ID du format de publicité sidebar
   - Utilisé pour les publicités dans les sidebars

5. **`NEXT_PUBLIC_ADSENSE_COMPACT_SLOT`** (optionnel)
   - Format : `1234567890`
   - ID du format de publicité compact
   - Utilisé pour les publicités compactes (mobile)

## Validation de propriété du site

AdSense propose 3 méthodes de validation. **La méthode `ads.txt` est recommandée** car elle est plus fiable :

### Méthode 1 : ads.txt (RECOMMANDÉ) ✅

1. Le fichier `public/ads.txt` a déjà été créé avec votre ID AdSense
2. Dans AdSense Dashboard → **Sites** → **Valider la propriété du site**
3. Sélectionnez **"Extrait ads.txt"**
4. Le contenu devrait être : `google.com, pub-1185676051061482, DIRECT, f08c47fec0942fa0`
5. Cochez **"J'ai ajouté le fichier ads.txt"**
6. Cliquez sur **"Valider"**

Le fichier sera accessible à : `https://waytotrack.com/ads.txt`

### Méthode 2 : Script AdSense dans <head>

Le script est déjà configuré dans `layout.tsx`. Si la méthode ads.txt ne fonctionne pas :
1. Vérifiez que `NEXT_PUBLIC_ADSENSE_ID` est configuré dans Vercel
2. Redéployez l'application
3. Attendez quelques heures que le robot Google indexe le site
4. Réessayez la validation

### Méthode 3 : Meta tag

Si les deux premières méthodes ne fonctionnent pas, AdSense peut proposer une balise meta à ajouter.

## Étapes de configuration

### 1. Obtenir votre ID AdSense

1. Connectez-vous à [Google AdSense](https://www.google.com/adsense/)
2. Allez dans **Account** → **Account information**
3. Copiez votre **Publisher ID** (format : `ca-pub-XXXXXXXXXX`)

### 2. Créer des formats de publicités dans AdSense

1. Dans AdSense Dashboard, allez dans **Ads** → **By ad unit**
2. Cliquez sur **+ New ad unit**
3. Créez un format de publicité **Display** (728x90 Desktop / Responsive Mobile)
4. Copiez l'**Ad unit ID** (format : `1234567890`)
5. Répétez pour les autres formats si nécessaire

### 3. Configurer les variables dans Vercel

1. Allez dans **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**
2. Ajoutez les variables suivantes :

   ```
   NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=1234567890
   ```

3. **Important** : Cochez **Production**, **Preview**, et **Development** pour chaque variable
4. Cliquez sur **Save**

### 4. Redéployer l'application

Après avoir ajouté les variables d'environnement, vous devez redéployer :

1. **Option A** : Faire un nouveau commit et push (Vercel déploiera automatiquement)
2. **Option B** : Dans Vercel Dashboard → **Deployments** → Cliquez sur **Redeploy** sur le dernier déploiement

## Vérification

### En développement local

1. Créez un fichier `.env.local` à la racine du projet :
   ```
   NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT=1234567890
   ```

2. Redémarrez le serveur de développement :
   ```bash
   npm run dev
   ```

3. Vous devriez voir un placeholder coloré avec "📢 PUB ADSENSE" en développement

### En production (Vercel)

1. Vérifiez que les variables d'environnement sont bien configurées dans Vercel
2. Vérifiez que l'utilisateur a accepté les cookies (banner de consentement)
3. Vérifiez que l'utilisateur n'est pas Pro (les utilisateurs Pro ne voient pas les pubs)
4. Les publicités devraient s'afficher automatiquement après quelques minutes

## Comportement des publicités

### Affichage conditionnel

Les publicités s'affichent uniquement si :
- ✅ `NEXT_PUBLIC_ADSENSE_ID` est configuré
- ✅ `NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT` est configuré (pour les pubs display)
- ✅ L'utilisateur a accepté les cookies (`cookieConsent === "accepted"`)
- ✅ L'utilisateur n'est pas Pro (`shouldShowAds === true`)
- ✅ On n'est pas sur une page légale (`/privacy`, `/terms`, `/about-us`)

### Réservation d'espace (Layout Shift Prevention)

Même si les publicités ne s'affichent pas (cookie non accepté, utilisateur Pro, etc.), l'espace est **toujours réservé** pour éviter le layout shift :
- **Hauteur réservée** : 90px (728x90 Desktop / Responsive Mobile)
- **Placeholder invisible** : Affiché si les conditions ne sont pas remplies

## Emplacements des publicités

1. **Après le header** : `AdSection` dans `layout.tsx` (ligne 207)
2. **Page d'accueil (après Hero)** : `AdSection` dans `page.tsx` (ligne 124)
3. **Avant le footer** : `AdSection` dans `layout.tsx` (ligne 232)

## Dépannage

### Les publicités ne s'affichent pas

1. **Vérifiez les variables d'environnement** :
   - Ouvrez la console du navigateur (F12)
   - Cherchez `[AdSense] NEXT_PUBLIC_ADSENSE_ID not configured` → Variable manquante
   - Cherchez `[AdSense] Failed to push ad` → Erreur de chargement

2. **Vérifiez le consentement aux cookies** :
   - Ouvrez la console du navigateur
   - Tapez `localStorage.getItem('plane-wise-cookie-consent')`
   - Doit retourner `"accepted"`

3. **Vérifiez le statut de l'utilisateur** :
   - Les utilisateurs **Pro** ne voient pas les publicités
   - Seuls les utilisateurs **Guest** et **Subscribed** voient les publicités

4. **Vérifiez que le site est approuvé par AdSense** :
   - Votre site doit être approuvé par Google AdSense
   - Les publicités peuvent prendre quelques heures/jours à apparaître après l'approbation

### Les publicités s'affichent mais le titre est toujours bas

- C'est normal si les publicités ne s'affichent pas (cookie non accepté, utilisateur Pro)
- L'espace est réservé pour éviter le layout shift
- Le titre sera correctement positionné une fois les publicités affichées

## Support

Si vous avez des problèmes :
1. Vérifiez les logs Vercel pour les erreurs
2. Vérifiez la console du navigateur pour les erreurs AdSense
3. Vérifiez que votre site est approuvé par AdSense
4. Contactez le support AdSense si nécessaire

