# ai.lamplitlabs.com - the landing page (ADR-001). The models it lists are trained and measured elsewhere; this
# repository is the site's source and its deploy. Targets are what the evaluators name (`make lint && make test`,
# `make ui-check`), mapped to the site's own checks.
.DEFAULT_GOAL := help
.PHONY: help setup lint test build ui-check hub-links ui-dev clean

UI := js/ui
PORT ?= 4174

help: ## List the targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

setup: ## Install the site's dependencies (js/ui/node_modules)
	cd $(UI) && npm ci

lint: ## Type-check the site (tsc -b), flag unused exports (lint:js), syntax-check the scripts, check FEAT-001's vitest count and README routes vs check-site defaults, site.json hub slugs
	cd $(UI) && npm run typecheck && npm run lint:js
	@for f in js/*.mjs $(UI)/scripts/*.mjs; do node --check "$$f" || exit 1; done
	@sh scripts/check-test-count.sh
	@sh scripts/check-routes-doc.sh

test: ## Unit tests (vitest) and a production build
	cd $(UI) && npm test && npm run build

build: ## Production build only (js/ui/dist)
	cd $(UI) && npm run build

# Serve js/ui/dist on $(PORT) and run check-site.mjs against it with the arguments in $(1); the server is stopped afterwards.
define with_preview
	@test -f $(UI)/dist/index.html || (echo "build first: make build" && exit 1)
	@node $(UI)/scripts/preview-static.mjs $(PORT) & pid=$$!; \
	  for i in $$(seq 1 50); do \
	    kill -0 $$pid 2>/dev/null || { wait $$pid; echo "preview server exited before accepting connections"; exit 1; }; \
	    curl -sf -o /dev/null http://127.0.0.1:$(PORT)/ && break; sleep 0.2; \
	  done; \
	  curl -sf -o /dev/null http://127.0.0.1:$(PORT)/ || { echo "preview server not reachable on port $(PORT)"; kill $$pid; exit 1; }; \
	  $(1); status=$$?; kill $$pid; exit $$status
endef

ui-check: ## Every route headless on the built site (needs Chrome/Edge; BROWSER_PATH to point at one), dark 1280 and light 390
	$(call with_preview,node js/check-site.mjs --base http://127.0.0.1:$(PORT) --theme dark --width 1280 && \
	  node js/check-site.mjs --base http://127.0.0.1:$(PORT) --theme light --width 390)

hub-links: ## ui-check (dark 1280) plus a HEAD request to every showcase "Try it"/"View weights" hub link; a 404 fails (needs network; CHECK_SITE_HUB_LINKS=warn to only warn)
	$(call with_preview,CHECK_SITE_HUB_LINKS=$${CHECK_SITE_HUB_LINKS:-fail} node js/check-site.mjs --base http://127.0.0.1:$(PORT) --theme dark --width 1280)

ui-dev: ## Vite dev server with hot reload
	cd $(UI) && npm run dev

clean: ## Remove the build
	rm -rf $(UI)/dist
