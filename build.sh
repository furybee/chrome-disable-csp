#!/bin/bash

set -euo pipefail

rm -rf ./build
rm -rf chrome-disable-csp.zip

mkdir -p ./build

cp -r ./src/* ./build

cd ./build && zip -r ../chrome-disable-csp.zip *

echo "Build complete"
