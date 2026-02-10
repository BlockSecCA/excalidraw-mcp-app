#!/bin/bash
# Download CDN dependencies for offline/hermetic tests
set -e

VENDOR_DIR="tests/vendor"
mkdir -p "$VENDOR_DIR"

echo "Downloading React..."
curl -sL -o "$VENDOR_DIR/react.js" "https://esm.sh/react@19.0.0"

echo "Downloading React DOM..."
curl -sL -o "$VENDOR_DIR/react-dom.js" "https://esm.sh/react-dom@19.0.0?deps=react@19.0.0"

echo "Downloading Excalidraw..."
curl -sL -o "$VENDOR_DIR/excalidraw.js" "https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@19.0.0,react-dom@19.0.0"

echo "Downloading Morphdom..."
curl -sL -o "$VENDOR_DIR/morphdom.js" "https://esm.sh/morphdom@2.7.8"

echo "Done. Vendor files in $VENDOR_DIR/"
ls -la "$VENDOR_DIR/"
