# Script de nettoyage complet des caches Next.js/Turbopack
Write-Host "Nettoyage des caches..." -ForegroundColor Yellow

# Supprimer .next
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✓ Dossier .next supprime" -ForegroundColor Green
} else {
    Write-Host "✗ Dossier .next n'existe pas" -ForegroundColor Gray
}

# Supprimer .turbo
if (Test-Path .turbo) {
    Remove-Item -Recurse -Force .turbo
    Write-Host "✓ Dossier .turbo supprime" -ForegroundColor Green
}

# Supprimer node_modules/.cache
if (Test-Path node_modules\.cache) {
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "✓ node_modules/.cache supprime" -ForegroundColor Green
}

# Supprimer .next/cache si existe
if (Test-Path .next\cache) {
    Remove-Item -Recurse -Force .next\cache
    Write-Host "✓ .next/cache supprime" -ForegroundColor Green
}

Write-Host "`nNettoyage termine! Vous pouvez maintenant redemarrer le serveur avec 'npm run dev'" -ForegroundColor Green

