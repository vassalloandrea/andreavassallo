#!/bin/sh
# warmer.sh
# Periodically warms the Nginx cache by crawling all URLs from the sitemap.
# Runs in a loop every 120 seconds inside the warmer Docker container.

set -x

echo "--- Warmer Script Started ---"

# Install required tools (runs on Alpine Linux)
apk add --no-cache curl grep sed coreutils

echo "Waiting for Nginx to be ready..."
sleep 5

# Use the real public hostname so the cache key matches production requests.
# This must match what Cloudflare sends as the Host header (e.g. andreavassallo.it).
REAL_HOST="${SITE_HOST:-andreavassallo.it}"

echo "Target Host: $REAL_HOST"

while true; do
  echo "--- Starting warming cycle ---"

  # Fetch the sitemap from the internal Nginx service.
  # We use the internal Docker network hostname "nginx" but pass the real Host header
  # so the cache key stored by Nginx matches future requests from Cloudflare.
  content=$(curl -sSL -H "Host: $REAL_HOST" http://nginx/sitemap.xml)

  if echo "$content" | grep -q "<loc>"; then
    echo "Sitemap found. Extracting URLs..."

    # Extract all <loc> values and strip the XML tags
    urls=$(echo "$content" | grep -o '<loc>[^<]*</loc>' | sed 's|<\/\{0,1\}loc>||g')

    for url in $urls; do
      # Strip protocol and domain to get just the path (e.g. /writings/)
      path=$(echo "$url" | sed -E 's|^https?://[^/]+||')

      # Default to root if path is empty
      if [ -z "$path" ]; then path="/"; fi

      # Warm the path by making a GET request through Nginx.
      # Cloudflare handles the non-trailing-slash → trailing-slash redirect,
      # so we only need to warm the canonical path (with trailing slash).
      echo "Warming: $path"
      curl -s -o /dev/null -L -H "Host: $REAL_HOST" "http://nginx$path"

      # Small delay to avoid hammering the app server
      sleep 0.1
    done
  else
    echo "WARNING: Sitemap content invalid or empty. Raw response:"
    echo "$content" | head -n 5
  fi

  echo "Cycle complete. Sleeping for 120 seconds..."
  sleep 120
done
