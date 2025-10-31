# Script PowerShell pour lancer Next.js avec Stripe CLI
# Usage: .\scripts\start-dev-with-stripe.ps1

Write-Host "🚀 Démarrage de Next.js avec Stripe CLI..." -ForegroundColor Cyan
Write-Host ""

# Vérifier si stripe.exe est dans le PATH
$stripeExists = Get-Command stripe -ErrorAction SilentlyContinue

if (-not $stripeExists) {
    Write-Host "❌ Stripe CLI n'est pas trouvé dans le PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Installation de Stripe CLI:" -ForegroundColor Yellow
    Write-Host "   1. Téléchargez depuis: https://github.com/stripe/stripe-cli/releases/latest" -ForegroundColor White
    Write-Host "   2. Extrayez stripe.exe dans un dossier (ex: C:\stripe-cli\)" -ForegroundColor White
    Write-Host "   3. Ajoutez ce dossier au PATH système OU utilisez l'option 2 ci-dessous" -ForegroundColor White
    Write-Host ""
    
    # Chercher stripe.exe dans des emplacements courants
    $possiblePaths = @(
        "$env:LOCALAPPDATA\stripe-cli\stripe.exe",
        "$env:ProgramFiles\stripe-cli\stripe.exe",
        "C:\stripe-cli\stripe.exe",
        "$env:USERPROFILE\stripe-cli\stripe.exe"
    )
    
    $stripePath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $stripePath = $path
            Write-Host "✅ Stripe CLI trouvé: $path" -ForegroundColor Green
            break
        }
    }
    
    if ($stripePath) {
        Write-Host ""
        Write-Host "💡 Utilisation de: $stripePath" -ForegroundColor Cyan
        Write-Host ""
        
        # Lancer avec le chemin complet
        $env:STRIPE_CMD = $stripePath
        Write-Host "▶️  Lancement de Next.js..." -ForegroundColor Cyan
        Start-Process npm -ArgumentList "run", "dev" -NoNewWindow
        
        Write-Host "▶️  Lancement de Stripe CLI..." -ForegroundColor Cyan
        & $stripePath listen --forward-to http://localhost:3000/api/stripe/webhook
    } else {
        Write-Host "❌ Stripe CLI non trouvé. Lancement de Next.js seul..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Pour installer Stripe CLI:" -ForegroundColor Cyan
        Write-Host "   1. Téléchargez: https://github.com/stripe/stripe-cli/releases/latest" -ForegroundColor White
        Write-Host "   2. Extrayez dans C:\stripe-cli\" -ForegroundColor White
        Write-Host "   3. Ajoutez C:\stripe-cli au PATH système" -ForegroundColor White
        Write-Host ""
        
        npm run dev
    }
} else {
    Write-Host "✅ Stripe CLI trouvé: $($stripeExists.Source)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "▶️  Lancement avec concurrently..." -ForegroundColor Cyan
    Write-Host ""
    
    npm run dev:with-webhooks
}

