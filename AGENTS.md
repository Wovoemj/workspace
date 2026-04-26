# Repository Guidelines

## Project Structure & Module Organization
This repository is a microservices-based travel assistant ("小游") featuring a polyglot backend and a modern frontend architecture.
- **`backend/`**: Contains Go-based microservices:
  - `gateway`: Entry point and request routing.
  - `user-service`, `product-service`, `order-service`: Core domain logic.
  - `ai-service`: Integration with AI models and vector search.
  - `recommend-service`, `notification-service`: Specialized features.
- **`frontend/`**: 
  - `user-web`: Next.js application for travelers.
  - `admin-web`: React-based administration dashboard.
- **`ai-core/`**: Centralized AI logic, agent definitions, and knowledge base.
- **`deployment/`**: Docker Compose and Kubernetes configurations for local and production environments.
- **`database/`**: Schema definitions, migrations, and seed data for MySQL, Elasticsearch, and Milvus.

## Build, Test, and Development Commands
### Database Initialization
```bash
python init_db.py
```

### Local Development (Docker)
```bash
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### Frontend (User Web)
Navigate to `frontend/user-web/`:
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Linting**: `npm run lint`
- **Type Check**: `npm run type-check`

### Backend Services
Navigate to specific service in `backend/`:
- **Run**: `go run main.go`

## Coding Style & Naming Conventions
- **Frontend**: Enforced via ESLint and Prettier. Uses Next.js 14 and TypeScript.
- **Backend**: Adheres to Go standard idioms (Gofmt/Golint).
- **AI Behavior**: Detailed in `docs/travel_assistant_rules.md`. Agents must:
  - Call web search before answering.
  - Follow P0-P3 information priority.
  - Use specific output templates with emojis.

## Commit & Pull Request Guidelines
Follow the established commit message pattern:
- `feat: <description>` for new features.
- `fix: <description>` for bug fixes.
- `chore: <description>` for maintenance tasks.
