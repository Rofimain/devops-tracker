# DevOps Tracker — Makefile
# Jalankan: make <command>

.PHONY: dev db-up db-down migrate seed studio build help

help:
	@echo "Available commands:"
	@echo "  make dev       — Start development server"
	@echo "  make db-up     — Start local PostgreSQL"
	@echo "  make db-down   — Stop local PostgreSQL"
	@echo "  make migrate   — Run Prisma migrations"
	@echo "  make seed      — Seed database"
	@echo "  make studio    — Open Prisma Studio"
	@echo "  make build     — Build Docker image"
	@echo "  make deploy    — Deploy ke server (via git push)"

dev:
	npm run dev

db-up:
	docker compose -f docker-compose.dev.yml up -d db
	@echo "✅ PostgreSQL running at localhost:5432"

db-down:
	docker compose -f docker-compose.dev.yml down

migrate:
	npx prisma migrate dev

seed:
	npm run db:seed

studio:
	npx prisma studio

build:
	docker build -t devops-tracker:local .

deploy:
	git push origin main
	@echo "🚀 CI/CD pipeline triggered — check GitHub Actions"

logs:
	ssh $$SERVER_USER@$$SERVER_HOST "cd /opt/devops-tracker && docker compose logs app -f --tail=50"
