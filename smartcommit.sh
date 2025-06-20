#!/bin/bash

# Demande à l'utilisateur un message personnalisé
read -p "📝 Message du commit : " CUSTOM_MSG

# Récupère la date
DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Ajoute tous les fichiers modifiés
git add .

# Génère un résumé des changements
SUMMARY=$(git diff --cached --stat)

# Compose le message complet
FINAL_MSG="[$DATE] $CUSTOM_MSG

Résumé des changements :
$SUMMARY"

# Effectue le commit
git commit -m "$FINAL_MSG"
