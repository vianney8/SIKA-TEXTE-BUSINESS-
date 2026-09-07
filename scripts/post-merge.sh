#!/usr/bin/env bash
set -euo pipefail

# Reconcile JavaScript dependencies added by merged tasks without prompts.
npm install --no-audit --no-fund

# Catch merged code that cannot produce the deployment bundle.
npm run build