#!/usr/bin/env bash
echo "Running server"

set -e # If any command fails, script exits immediately

THIS_SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $THIS_SCRIPTS_DIR/../js/dist

python -m SimpleHTTPServer 8080;