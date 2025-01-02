#!/bin/sh
# warmer.sh

# 1. Debug mode (prints every command)
set -x

echo "--- Warmer Script Started ---"

# 2. Install dependencies
apk add --no-cache curl grep sed coreutils

echo "Waiting for Nginx..."
sleep 5

echo "Target Host: $SITE_HOST"

while true; do
  echo "--- Starting cycle ---"

  # Fetch sitemap from the internal nginx service
  content=$(curl -sSL -H "Host: $SITE_HOST" http://nginx/sitemap.xml)

  # Check if we got XML content
  if echo "$content" | grep -q "<loc>"; then
     echo "Sitemap found. Extracting URLs..."

     # Clean extraction of URLs
     urls=$(echo "$content" | grep -o '<loc>[^<]*</loc>' | sed 's|<\/\{0,1\}loc>||g')

     for url in $urls; do
       # Remove protocol and domain to get the path
       path=$(echo "$url" | sed -E 's|^https?://[^/]+||')

       # Default to root if path is empty
       if [ -z "$path" ]; then path="/"; fi

       # 1. Warm the exact path from sitemap (usually has trailing slash)
       echo "Warming: $path"
       curl -I -H "Host: $SITE_HOST" "http://nginx$path"

       # 2. Warm the "No Slash" variant
       # If the path ends in a slash (and isn't just root), remove it and warm that too.
       # This ensures `curl .../waypoints` hits the cache even if sitemap says `/waypoints/`
       if [ "$path" != "/" ] && [ "${path}" != "${path%/}" ]; then
           path_no_slash="${path%/}"
           echo "Warming variant: $path_no_slash"
           curl -I -H "Host: $SITE_HOST" "http://nginx$path_no_slash"
       fi

       sleep 0.1
     done
  else
     echo "WARNING: Sitemap content invalid or empty. Content received:"
     echo "$content" | head -n 5
  fi

  echo "Cycle complete. Sleeping for 120 seconds..."
  sleep 120
done
