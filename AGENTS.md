<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nyre

- UI and user-facing text are in Spanish (es-MX); keep it that way.
- Money is stored as positive integer cents in `amount_cents`; the sign comes from `type` (`income` | `expense`).
- Every server action must call `requireWorkspace(id)` (or `requireOwner`) before touching data and scope queries by `workspaceId`.
- After editing `src/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.
- Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Financial rules (budgets, goals, bills, debts, ant expenses, 50/30/20, tips) are pure functions in `src/lib/*.ts` with tests next to them; pages only fetch data and render. `src/lib/overview.ts` builds the monthly snapshot shared by the dashboard and the family meeting page.
- Advice shown to families must stay in plain Spanish and cite its basis (CONDUSEF, studies) in the README "Fuentes" section.
