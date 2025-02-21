.PHONY: clean
clean:
	rm -rf dist || true
	rm -rf coverage || true
	rm *.log || true
	rm .jsii || true
	rm tsconfig.tsbuildinfo || true
	rm tsconfig.json || true
	find ./products -name "*.d.ts" | xargs rm
	find ./products -name "*.js" | xargs rm
	find ./utils -name "*.js" | xargs rm
	find ./utils -name "*.d.ts" | xargs rm


.PHONY: pr
pr:
	make build-app
	npm run lint
	npm run test

.PHONY: format-app
format-app:
	npm run format

.PHONY: build-app
build-app:
	npm run build:jsii

.PHONY: package-app
package-app:
	npm run package

.PHONY: deploy-npm
deploy-npm:
	$(eval PKG_VERSION := $(shell cat package.json | jq -r '.version'))
	(npm info @wsb/gd-service-catalog@${PKG_VERSION} >/dev/null && echo "NPM package version ${PKG_VERSION} already published") || npm --verbose publish
 