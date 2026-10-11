#!/bin/sh
# Run the full verification: lint then test (see Makefile).
set -eu
cd "$(dirname "$0")/.."
make lint && make test
