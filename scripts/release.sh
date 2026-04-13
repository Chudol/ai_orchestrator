#!/bin/bash
set -euo pipefail

RELEASE_REPO="Chudol/solmeron_release"
RELEASE_DIR="release"

# Load .env if present (for GH_TOKEN)
if [ -f .env ]; then
  export $(grep -E '^GH_TOKEN=' .env | xargs)
fi

if [ -z "${GH_TOKEN:-}" ]; then
  echo "❌ GH_TOKEN not set. Add it to .env"
  exit 1
fi

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

echo "🚀 Releasing Solmeron ${TAG}"

# Check release dir has build artifacts
if ! ls "${RELEASE_DIR}"/Solmeron-*.dmg &>/dev/null; then
  echo "❌ No build artifacts found in ${RELEASE_DIR}/"
  echo "   Run 'pnpm prod' first."
  exit 1
fi

# Check if tag already exists in release repo
if gh release view "${TAG}" --repo "${RELEASE_REPO}" &>/dev/null; then
  echo "❌ Release ${TAG} already exists in ${RELEASE_REPO}"
  echo "   Bump version in package.json first."
  exit 1
fi

# Collect files to upload
FILES=()
for f in "${RELEASE_DIR}"/Solmeron-*-arm64.dmg \
         "${RELEASE_DIR}"/Solmeron-*-arm64-mac.zip \
         "${RELEASE_DIR}"/Solmeron-*-arm64-mac.zip.blockmap \
         "${RELEASE_DIR}"/latest-mac.yml; do
  [ -f "$f" ] && FILES+=("$f")
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "❌ No release files found"
  exit 1
fi

echo "📦 Uploading ${#FILES[@]} files:"
printf "   %s\n" "${FILES[@]}"

# Create GitHub release
gh release create "${TAG}" \
  --repo "${RELEASE_REPO}" \
  --title "Solmeron ${TAG}" \
  --notes "Solmeron ${TAG}" \
  "${FILES[@]}"

echo "✅ Released ${TAG} → https://github.com/${RELEASE_REPO}/releases/tag/${TAG}"
