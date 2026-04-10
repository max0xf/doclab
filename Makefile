
WORKSPACE_PATH = $(shell pwd)
NPM_MAXSOCKETS ?= 1

TARGET_BRANCH ?= master

DOCKER_IMAGE_TAG ?= cyber-wiki-ci
DOCKER_IMAGE_PATH = $(DOCKER_IMAGE_TAG)
CONTAINER_HOME = /workspace

###
# Build CI Docker image from build/ci/Dockerfile
#
build-image:
	@echo "Building CI Docker image $(DOCKER_IMAGE_TAG)"
	docker build -t $(DOCKER_IMAGE_TAG) -f build/ci/Dockerfile .

###
# Build staging Docker images
#
build-frontend:
	@echo "Building frontend staging image"
	docker build -t cyber-wiki-frontend -f build/Dockerfile.frontend --dockerignore-file build/.dockerignore .

build-backend:
	@echo "Building backend staging image"
	docker build -t cyber-wiki-backend -f build/Dockerfile.backend --dockerignore-file build/.dockerignore .

###
# CI (Docker - for Jenkins pipeline)
# job:
# pipeline: /Jenkinsfile
#
ci: build-image
	git diff --name-only --diff-filter=A origin/$(TARGET_BRANCH)...HEAD > added-files.txt
	docker run -u $$(id -u):$$(id -g) -i --rm --network=host --cpus='16' --memory=20480m --memory-swap=-1 \
		--entrypoint /workspace/build/ci/run.sh \
		-v $(WORKSPACE_PATH):$(CONTAINER_HOME) \
		-e HOME=$(CONTAINER_HOME) \
		-e NPM_MAXSOCKETS=$(NPM_MAXSOCKETS) \
		-e DJANGO_SECRET_KEY=ci-test-secret-key \
		$(DOCKER_IMAGE_PATH)

###
# CI (Local - runs directly without Docker)
#
ci-local: build-image
	git diff --name-only --diff-filter=A origin/$(TARGET_BRANCH)...HEAD > added-files.txt
	docker run -u $$(id -u):$$(id -g) --cpus='4' --memory=20480m --memory-swap=-1 \
		--entrypoint /workspace/build/ci/run.sh \
		-v $(WORKSPACE_PATH):$(CONTAINER_HOME) \
		-e HOME=$(CONTAINER_HOME) \
		-e NPM_MAXSOCKETS=$(NPM_MAXSOCKETS) \
		-e DJANGO_SECRET_KEY=ci-test-secret-key \
		$(DOCKER_IMAGE_PATH)

.PHONY: build-image build-frontend build-backend ci ci-local
