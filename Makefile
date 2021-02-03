SHELL := bash

DOCKER_TAG ?= latest

# Don't delete intermediary files we touch under .make,
# which are markers for things we have done.
# https://stackoverflow.com/questions/5426934/why-this-makefile-removes-my-goal
.SECONDARY:

bootstrap: .make/bootstrap

# Just alias for bootstrap
setup: .make/bootstrap

docker-build-all: \
	docker-build/explorer \
	docker-build/event-web-server \
	docker-build/event-handler

docker-build/explorer: .make/docker-build/explorer

docker-build/event-web-server: .make/docker-build/event-web-server

docker-build/event-handler: .make/docker-build/event-handler

build-explorer: .make/npm/build-explorer

build-event-store: .make/npm/build-event-store

build-all: \
	   build-explorer

test:
	yarn test
	cd packages/event_store && npm test && cd -

# install all package
.make/bootstrap:
	npm install lerna
	yarn bootstrap
	cd packages/sdk
	npm install tslint

.make/npm/build-explorer: .make/bootstrap
	# CI=false so on Drone it won't fail on warnings (currently about href).
	yarn run build
	mkdir -p $(dir $@) && touch $@

.make/docker-build/explorer: build-explorer
	docker build -t casperlabs/explorer:$(DOCKER_TAG) .
	mkdir -p $(dir $@) && touch $@

.make/docker-build/event-web-server:
	cd packages/event_store && \
	docker build -t casperlabs/event-web-server:$(DOCKER_TAG) -f Dockerfile.web_server .
	mkdir -p $(dir $@) && touch $@

.make/docker-build/event-handler:
	cd packages/event_store && \
	docker build -t casperlabs/event-handler:$(DOCKER_TAG) -f Dockerfile.handler .
	mkdir -p $(dir $@) && touch $@

clean:
	lerna clean -y || true
	rm -rf node_modules
	rm -rf packages/event_store/node_modules
	rm -rf .make
