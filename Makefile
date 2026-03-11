.PHONY: setup start stop test lint deploy-dev clean

# ─── First-time setup ─────────────────────
setup:
	@echo "🔧 Setting up CMS development environment..."
	cp -n .env.example .env || true
	cd frontend && npm install
	cd backend && uv sync
	docker compose -f docker-compose.local.yml up dynamodb-local -d
	@sleep 2
	cd infrastructure && python scripts/create_tables.py
	cd infrastructure && python scripts/seed_data.py
	@echo "✅ Setup complete! Run 'make start' to begin."

# ─── Start local services ─────────────────
start:
	@echo "🚀 Starting CMS locally..."
	docker compose -f docker-compose.local.yml up dynamodb-local -d
	@echo "DynamoDB Local: http://localhost:8000"
	@echo ""
	@echo "Now open two terminals:"
	@echo "  Terminal 1: cd backend && sam local start-api --port 3001 --env-vars env.json"
	@echo "  Terminal 2: cd frontend && npm run dev"

# ─── Stop local services ──────────────────
stop:
	@echo "🛑 Stopping local services..."
	docker compose -f docker-compose.local.yml down

# ─── Run all tests ────────────────────────
test: test-frontend test-backend

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && uv run pytest tests/ -v

# ─── Lint ─────────────────────────────────
lint: lint-frontend lint-backend

lint-frontend:
	@echo "🔍 Linting frontend..."
	cd frontend && npm run lint

lint-backend:
	@echo "🔍 Linting backend..."
	cd backend && uv run flake8 functions/ layers/
	cd backend && uv run mypy functions/ layers/

# ─── Deploy ───────────────────────────────
deploy-dev:
	@echo "🚢 Deploying to dev..."
	cd backend && uv export --no-hashes --no-dev -o requirements.txt
	cd backend && sam build && sam deploy --config-env dev
	cd frontend && npm run build
	@echo "✅ Deploy complete."

# ─── Clean ────────────────────────────────
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf frontend/dist frontend/node_modules/.vite
	rm -rf backend/.aws-sam
	rm -f backend/requirements.txt backend/requirements-dev.txt
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Clean complete."

# ─── Seed data ────────────────────────────
seed:
	cd infrastructure && python scripts/create_tables.py
	cd infrastructure && python scripts/seed_data.py

# ─── Generate shared types ────────────────
generate-types:
	cd shared && python scripts/generate_ts_types.py
	cd shared && python scripts/generate_pydantic_models.py

# ─── Add backend dependency ───────────────
add:
	cd backend && uv add $(pkg)
	@echo "Usage: make add pkg=<package-name>"

add-dev:
	cd backend && uv add --dev $(pkg)
	@echo "Usage: make add-dev pkg=<package-name>"

# ─── Export requirements (for SAM build) ──
export-reqs:
	cd backend && uv export --no-hashes --no-dev -o requirements.txt
	@echo "✅ requirements.txt generated from pyproject.toml"