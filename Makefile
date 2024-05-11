install:
	docker build -t sili .

dev:
	docker run --rm -p 8888:8888 --env-file .env sili

.PHONY: install