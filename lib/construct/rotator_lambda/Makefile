SHELL := /bin/bash
ARTIFACT_NAME = $(shell basename "$$PWD")
ARTIFACT_VERSION = $(shell poetry version | cut -d " " -f 2)

.PHONY: init
init:
	poetry install
	poetry env info

.PHONY: lint
lint:
	poetry run flake8 --max-line-length 120

.PHONY: clean
clean:
	rm -f .coverage
	rm -f coverage.xml
	rm -f report.xml
	rm -f requirements.txt
	rm -rf .eggs
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf build
	rm -rf dist
	rm -rf src/{{ lambda_name }}.egg-info


.PHONY: build
build:
	mkdir build
	poetry build -f wheel
	poetry export --without-hashes --format requirements.txt > requirements.txt
	poetry run pip install -I --target build -r requirements.txt
	poetry run pip install -I --target build --no-deps dist/${ARTIFACT_NAME}-${ARTIFACT_VERSION}-py3-none-any.whl
	cd build && zip ../dist/${ARTIFACT_NAME}-${ARTIFACT_VERSION}.zip . -r9 -x "*.pyc"

