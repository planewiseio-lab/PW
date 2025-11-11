# Fleet Status Setup Guide

## Problème de Permission Prisma

Si vous obtenez l'erreur `EPERM: operation not permitted` lors de `npx prisma generate`, c'est parce que le serveur de développement Next.js utilise encore les fichiers Prisma.

### Solution

1. **Arrêter le serveur de développement** :
   - Appuyez sur `Ctrl+C` dans le terminal où Next.js tourne
   - Ou fermez complètement le terminal

2. **Générer le client Prisma** :
   ```bash
   npx prisma generate
   ```

3. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

## Création de la Table dans Supabase

1. **Ouvrir Supabase Dashboard** :
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrir l'éditeur SQL** :
   - Cliquez sur "SQL Editor" dans le menu de gauche

3. **Exécuter la migration** :
   - Copiez le contenu du fichier `prisma/migrations/add_fleet_status_table.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

4. **Vérifier la création** :
   - Allez dans "Table Editor"
   - Vous devriez voir la table `fleet_status` dans la liste

## Vérification

Après avoir créé la table et généré Prisma, le dashboard devrait :
- Charger les statuts depuis la base de données à l'ouverture
- Ne plus afficher d'erreur "Failed to load fleet statuses from DB"
- Permettre de mettre à jour les statuts via le bouton "Update Fleet Status"


