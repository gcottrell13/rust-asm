#!/usr/bin/env bash

set -e # If any command fails, script exits immediately

THIS_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $THIS_SCRIPTS_DIR/../js/dist
rm *

ln -s ../../dist wasm
cd ..

cd ./dist
ln -s ../src/node_modules node_modules
cd ..

cp ./src/index.html ./dist/index.html
