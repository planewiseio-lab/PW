// Script pour vérifier si Stripe CLI est installé et accessible
const { execSync } = require('child_process');
const path = require('path');

function checkStripeCLI() {
  try {
    // Essayer d'exécuter stripe --version
    const version = execSync('stripe --version', { encoding: 'utf-8' });
    console.log('✅ Stripe CLI est installé:', version.trim());
    return true;
  } catch (error) {
    console.log('❌ Stripe CLI n\'est pas trouvé dans le PATH');
    console.log('\n📥 Pour installer Stripe CLI:');
    console.log('   1. Téléchargez depuis: https://github.com/stripe/stripe-cli/releases/latest');
    console.log('   2. Extrayez stripe.exe dans un dossier (ex: C:\\stripe-cli\\)');
    console.log('   3. Ajoutez ce dossier au PATH système');
    console.log('   4. Redémarrez le terminal');
    return false;
  }
}

checkStripeCLI();

