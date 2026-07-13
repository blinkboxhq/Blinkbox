# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Blinkbox, please report it privately:

- **Email:** blinkbox.co.in@gmail.com
- Include a description, steps to reproduce, and the potential impact.
- Please do **not** open a public GitHub issue for security reports.

You will receive an acknowledgement within 72 hours. Please allow reasonable
time for a fix before any public disclosure.

## Scope

- `apps/backend` — Express API, execution engine, workers, pollers
- `apps/frontend` — React application
- `packages/*` — shared libraries

## Security Measures in Place

- JWT auth on all execution and workspace routes; fail-fast if `JWT_SECRET` is unset
- Workspace isolation enforced on every database query
- Credentials encrypted at rest; access scoped per workspace
- SSRF guard on all outbound URL fetches (HTTP request, web scraper)
- Shell/desktop tools disabled unless `ENABLE_SHELL_TOOLS=true` (off in production)
- Helmet security headers, CORS origin whitelist, request body size limits
- Redis-backed webhook rate limiting; login attempt throttling
- Prototype-pollution guards in dynamic field mapping
- Secrets live only in `.env` files, which are never committed
