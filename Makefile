# ai.lamplitlabs.com - the landing page (ADR-001). The models it lists are trained and measured elsewhere; this
# repository is the site's source and its deploy. Targets are what the evaluators name (`make lint && make test`,
# `make ui-check`), mapped to the site's own checks.
.DEFAULT_GOAL := help
.PHONY: help setup lint test build ui-check ui-dev clean

UI := js/ui
PORT ?= 4174

help: ## List the targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

setup: ## Install the site's dependencies (js/ui/node_modules)
	cd $(UI) && npm ci

lint: ## Type-check the site (tsc -b) and syntax-check the scripts
	cd $(UI) && npm run typecheck
	@for f in js/*.mjs $(UI)/scripts/*.mjs; do node --check "$$f" || exit 1; done

test: ## Unit tests (vitest) and a production build
	cd $(UI) && npm test && npm run build

build: ## Production build only (js/ui/dist)
	cd $(UI) && npm run build

ui-check: ## Every route headless on the built site (needs Chrome/Edge; BROWSER_PATH to point at one), dark 1280 and light 390
	@test -f $(UI)/dist/index.html || (echo "build first: make build" && exit 1)
	@node $(UI)/scripts/preview-static.mjs $(PORT) & pid=$$!; sleep 1; \
	  node js/check-site.mjs --base http://127.0.0.1:$(PORT) --theme dark --width 1280 && \
	  node js/check-site.mjs --base http://127.0.0.1:$(PORT) --theme light --width 390; status=$$?; kill $$pid; exit $$status

ui-dev: ## Vite dev server with hot reload
	cd $(UI) && npm run dev

clean: ## Remove the build
	rm -rf $(UI)/dist
