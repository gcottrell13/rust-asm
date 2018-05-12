echo "==========================================================="
echo "BUILDING TO WASM"
echo "==========================================================="

set -e # If any command fails, script exits immediately

THIS_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $THIS_SCRIPTS_DIR/../rust

wasmFilename="dsl_wasm.wasm"

rm -rf ../dist/*

# Compile to wasm
cargo +nightly build --target wasm32-unknown-unknown --release

# Move to dist
cp "target/wasm32-unknown-unknown/release/$wasmFilename" "../dist"

cd ../js

webpack

cd ..

cp -a js/index.html dist/
cp -a js/dist/. dist/

# Minify wasm output
# Note: if wasm-gc becomes too slow for development, create a separate script for a production build
# wasm-gc dist/wasm_astar.wasm dist/wasm_astar.wasm