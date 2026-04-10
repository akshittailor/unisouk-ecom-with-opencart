# OpenCart API Adapter (for NestJS integration)

This package provides OpenCart 4.x custom API routes for:
- Product CRUD with variant/option shape
- Order listing/detail/status update
- Inventory read/update at base and variant level

Routes are exposed via `route=custom/*` (not `route=api/*`) to avoid OpenCart 4.1.0.2 core API signature middleware.

