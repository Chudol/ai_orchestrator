#!/bin/bash
set -euo pipefail

RELEASE_REPO="Chudol/solmeron_release"
RELEASE_DIR="release"
DMG_UPLOAD="Solmeron-arm64.dmg"
ZIP_UPLOAD="Solmeron-arm64-mac.zip"

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

# Clean release dir before build
echo "🧹 Cleaning release directory..."
rm -rf "${RELEASE_DIR:?}"/*

# Build
echo "📦 Building..."
pnpm prod

# Find built artifacts (versioned names)
DMG=$(ls "${RELEASE_DIR}"/Solmeron-*-arm64.dmg 2>/dev/null | head -1)
ZIP=$(ls "${RELEASE_DIR}"/Solmeron-*-arm64-mac.zip 2>/dev/null | head -1)

if [ -z "${DMG}" ]; then
  echo "❌ No DMG found in ${RELEASE_DIR}/"
  exit 1
fi
if [ -z "${ZIP}" ]; then
  echo "❌ No ZIP found in ${RELEASE_DIR}/"
  exit 1
fi

# Copy to stable names for upload
DMG_PATH="${RELEASE_DIR}/${DMG_UPLOAD}"
ZIP_PATH="${RELEASE_DIR}/${ZIP_UPLOAD}"
cp "${DMG}" "${DMG_PATH}"
cp "${ZIP}" "${ZIP_PATH}"
echo "📎 ${DMG} → ${DMG_PATH}"
echo "📎 ${ZIP} → ${ZIP_PATH}"

# Compute sha512 hashes (base64-encoded, as electron-updater expects)
sha512_b64() {
  shasum -a 512 "$1" | awk '{print $1}' | xxd -r -p | base64
}

DMG_SHA512=$(sha512_b64 "${DMG_PATH}")
DMG_SIZE=$(stat -f%z "${DMG_PATH}")
ZIP_SHA512=$(sha512_b64 "${ZIP_PATH}")
ZIP_SIZE=$(stat -f%z "${ZIP_PATH}")

# Patch latest-mac.yml — ZIP as primary (used by auto-updater), DMG as secondary
LATEST_YML="${RELEASE_DIR}/latest-mac.yml"
cat > "${LATEST_YML}" <<EOF
version: ${VERSION}
files:
  - url: ${ZIP_UPLOAD}
    sha512: ${ZIP_SHA512}
    size: ${ZIP_SIZE}
  - url: ${DMG_UPLOAD}
    sha512: ${DMG_SHA512}
    size: ${DMG_SIZE}
path: ${ZIP_UPLOAD}
sha512: ${ZIP_SHA512}
releaseDate: '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'
EOF

echo "📝 Patched latest-mac.yml"

# Delete existing release if it exists
if gh release view "${TAG}" --repo "${RELEASE_REPO}" &>/dev/null; then
  echo "🗑️  Deleting existing release ${TAG}..."
  gh release delete "${TAG}" --repo "${RELEASE_REPO}" --yes --cleanup-tag
fi

# Create GitHub release
gh release create "${TAG}" \
  --repo "${RELEASE_REPO}" \
  --title "Solmeron ${TAG}" \
  --notes "Solmeron ${TAG}" \
  "${DMG_PATH}" \
  "${ZIP_PATH}" \
  "${LATEST_YML}"

echo "✅ Released ${TAG} → https://github.com/${RELEASE_REPO}/releases/tag/${TAG}"
