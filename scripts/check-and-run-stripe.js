#!/usr/bin/env node
/**
 * Script qui vérifie si Stripe CLI est disponible et lance Next.js avec Stripe CLI
 * Si Stripe CLI n'est pas trouvé, affiche des instructions et lance juste Next.js
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkStripeCLI() {
  // Vérifier si stripe est dans le PATH
  try {
    execSync('stripe --version', { stdio: 'ignore' });
    return { found: true, command: 'stripe' };
  } catch (error) {
    // Stripe n'est pas dans le PATH, chercher dans des emplacements communs
    const possiblePaths = [
      path.join(process.env.LOCALAPPDATA || '', 'stripe-cli', 'stripe.exe'),
      path.join('C:', 'stripe-cli', 'stripe.exe'),
      path.join(process.env.USERPROFILE || '', 'stripe-cli', 'stripe.exe'),
      path.join(process.env.ProgramFiles || '', 'stripe-cli', 'stripe.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'stripe-cli', 'stripe.exe'),
      // Chercher dans le Desktop/Stripe (cas spécifique de l'utilisateur)
      path.join(process.env.USERPROFILE || '', 'Desktop', 'Aviation', 'Stripe', 'stripe_1.32.0_windows_x86_64', 'stripe.exe'),
      // Chercher dans tous les dossiers Stripe sur le Desktop
      path.join(process.env.USERPROFILE || '', 'Desktop', 'Stripe', 'stripe.exe'),
      // Chercher récursivement dans Desktop (limité aux dossiers stripe_*)
      ...(function() {
        const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
        const paths = [];
        try {
          const items = fs.readdirSync(desktopPath, { withFileTypes: true });
          for (const item of items) {
            if (item.isDirectory() && item.name.toLowerCase().includes('stripe')) {
              // Chercher stripe.exe dans ce dossier
              const stripeExePath = path.join(desktopPath, item.name, 'stripe.exe');
              if (fs.existsSync(stripeExePath)) {
                paths.push(stripeExePath);
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs de lecture
        }
        return paths;
      })(),
    ];

    for (const stripePath of possiblePaths) {
      if (fs.existsSync(stripePath)) {
        return { found: true, command: `"${stripePath}"` };
      }
    }

    return { found: false };
  }
}

function main() {
  console.log('🚀 Vérification de Stripe CLI...\n');

  const stripeCheck = checkStripeCLI();

  if (!stripeCheck.found) {
    console.log('❌ Stripe CLI n\'est pas trouvé.\n');
    console.log('📥 Pour installer Stripe CLI:\n');
    console.log('   1. Téléchargez: https://github.com/stripe/stripe-cli/releases/latest');
    console.log('   2. Extrayez stripe.exe dans C:\\stripe-cli\\');
    console.log('   3. Ajoutez C:\\stripe-cli au PATH système');
    console.log('   4. Redémarrez votre terminal\n');
    console.log('💡 En attendant, Next.js sera lancé sans Stripe CLI.\n');
    console.log('   Pour tester les webhooks, utilisez le script:');
    console.log('   tsx scripts/fix-stripe-subscription.ts --subscription-id <id>\n');
    console.log('▶️  Lancement de Next.js seul...\n');
    
    // Lancer juste Next.js
    spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    });
    return;
  }

  console.log('✅ Stripe CLI trouvé!\n');
  console.log('▶️  Lancement de Next.js et Stripe CLI...\n');

  // Utiliser concurrently pour lancer les deux
  const concurrently = require('concurrently');
  
  concurrently(
    [
      {
        name: 'nextjs',
        command: 'npm run dev',
        prefixColor: 'blue',
      },
      {
        name: 'stripe',
        command: `${stripeCheck.command} listen --forward-to http://localhost:3000/api/stripe/webhook`,
        prefixColor: 'green',
      },
    ],
    {
      prefix: '[{name}]',
      killOthers: ['failure', 'success'],
      restartTails: true,
    }
  );
}

main();

