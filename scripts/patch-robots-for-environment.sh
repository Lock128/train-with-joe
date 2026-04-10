#!/bin/bash
# Patches robots.txt and <meta name="robots"> for non-production environments
# to prevent search engine indexing of sandbox/beta deployments.
#
# Usage: ./scripts/patch-robots-for-environment.sh <namespace>
#
# Must be run AFTER the build step, before S3 sync.

set -euo pipefail

NAMESPACE="${1:?Usage: patch-robots-for-environment.sh <namespace>}"

FRONTEND_BUILD="frontend/src/build/web"
JOIN_PAGE_BUILD="join_page/dist/train-with-joe-join/browser"

if [ "${NAMESPACE}" = "production" ]; then
  echo "✅ Production environment — keeping robots.txt as-is (indexing allowed)"
  exit 0
fi

echo "🚫 Non-production environment (${NAMESPACE}) — blocking search engine indexing"

# --- Patch robots.txt ---
NOINDEX_ROBOTS="User-agent: *
Disallow: /"

for BUILD_DIR in "${FRONTEND_BUILD}" "${JOIN_PAGE_BUILD}"; do
  ROBOTS_FILE="${BUILD_DIR}/robots.txt"
  if [ -d "${BUILD_DIR}" ]; then
    echo "${NOINDEX_ROBOTS}" > "${ROBOTS_FILE}"
    echo "  ✅ Patched ${ROBOTS_FILE}"
  else
    echo "  ⚠️  Build directory not found: ${BUILD_DIR}"
  fi
done

# --- Remove sitemap.xml (no point exposing it for non-production) ---
for BUILD_DIR in "${FRONTEND_BUILD}" "${JOIN_PAGE_BUILD}"; do
  SITEMAP_FILE="${BUILD_DIR}/sitemap.xml"
  if [ -f "${SITEMAP_FILE}" ]; then
    rm -f "${SITEMAP_FILE}"
    echo "  ✅ Removed ${SITEMAP_FILE}"
  fi
done

# --- Patch <meta name="robots"> in index.html ---
for BUILD_DIR in "${FRONTEND_BUILD}" "${JOIN_PAGE_BUILD}"; do
  INDEX_FILE="${BUILD_DIR}/index.html"
  if [ -f "${INDEX_FILE}" ]; then
    sed -i.bak \
      -e 's|<meta name="robots" content="index, follow">|<meta name="robots" content="noindex, nofollow">|g' \
      "${INDEX_FILE}"
    rm -f "${INDEX_FILE}.bak"
    echo "  ✅ Patched meta robots in ${INDEX_FILE}"
  else
    echo "  ⚠️  index.html not found: ${INDEX_FILE}"
  fi
done

echo "✅ Non-production SEO blocking applied for namespace=${NAMESPACE}"
