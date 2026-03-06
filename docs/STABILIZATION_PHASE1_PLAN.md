# Phase 1 Stabilization Implementation Plan

Validated assumptions (in-code verification) before changes.

## Validation Summary

| Assumption | Result |
|------------|--------|
| **Primary entry point** | `src/app/[[...panel]]/page.tsx` is the true primary entry. Handles `/` and all panel routes. |
| **src/page.tsx** | Orphan file. Next.js App Router uses `src/app/` only. `src/page.tsx` is NOT used in dev navigation. |
| **WebSocket debug fetch** | `src/lib/websocket.ts` lines 255–273: dev-only `fetch('http://127.0.0.1:7803/ingest/...')` in `sendConnectHandshake`. |
| **/api/gateways/health** | EXISTS at `src/app/api/gateways/health/route.ts`. POST handler, requires `viewer` role. Panel calls it correctly. 401 = auth, not missing route. |
| **401 login / seed** | Caused by: (1) `AUTH_PASS` not set → seed skipped, (2) `AUTH_PASS` matches `INSECURE_PASSWORDS` (e.g. `change-me-on-first-login` from .env.example) → seed skipped. Either way, no admin user → login fails with 401. |

---

## Issue 1: First-run authentication

**Files:** `src/lib/db.ts`  
**Root cause:** When `AUTH_PASS` is unset or matches `INSECURE_PASSWORDS` (including `.env.example`’s `change-me-on-first-login`), admin seeding is skipped. Clean dev boot yields no admin user → all logins 401.

**Proposed fix:** In development only, allow first-run seeding with `change-me-on-first-login` (or any value in `AUTH_PASS`) so a dev boot with default `.env.example` produces a working login. Log a clear warning to change the password for production.

**Risk:** Slightly relaxed security in dev; production unchanged.

**Test:** `rm .data/mission-control.db 2>/dev/null; pnpm dev`, open `/login`, log in with `admin` / `change-me-on-first-login`.

---

## Issue 2: WebSocket debug ingestion

**Files:** `src/lib/websocket.ts`  
**Root cause:** Dev-only `fetch` to `http://127.0.0.1:7803/ingest/...` in `sendConnectHandshake` (lines 255–273) runs on every connect, can fail or slow startup.

**Proposed fix:** Remove the entire dev-only fetch block.

**Risk:** None; debug-only code.

**Test:** `pnpm dev`, connect to gateway on 18789, confirm no fetch to 7803 in network tab.

---

## Issue 3: Gateway health route

**Files:** None for route; `src/components/panels/multi-gateway-panel.tsx` if auth UX needs improvement.  
**Root cause:** Route exists; 401s come from auth (no session / expired session).

**Proposed fix:** No route change. If 401 occurs during probe, the panel could show a clearer message; low priority. Defer unless we see concrete UX issues.

**Test:** Log in, go to Gateways, click Probe. Should return 200 when authenticated.

---

## Issue 4: Gateway reconnect and connection-state messaging

**Files:** `src/lib/websocket.ts`, `src/store/index.ts`, `src/components/panels/multi-gateway-panel.tsx`, header/layout components that show connection state.  
**Root cause:** Reconnect behavior may be brittle; UI may not clearly show connecting/disconnected/reconnecting.

**Proposed fix:** (1) Ensure reconnect backoff and non-retryable handling are correct. (2) Surface connection state (connecting, connected, reconnecting, error) in the UI.

**Risk:** Low; mostly clarity and robustness.

**Test:** `pnpm dev` + gateway on 18789. Stop gateway, restart; verify reconnect and UI state updates.

---

## Issue 5: macOS status/metrics safety

**Files:** `src/app/api/status/route.ts`  
**Root cause:** `runCommand` for `sysctl`, `vm_stat`, `df`, `ps` can fail or produce unexpected output; parsing may assume Linux layout.

**Proposed fix:** Wrap platform-specific blocks in try/catch, validate parsing, handle macOS `df`/`vm_stat` formats safely. Return safe defaults on failure.

**Risk:** Low; defensive parsing.

**Test:** `pnpm dev`, call `GET /api/status?action=overview`; verify no 500 and sane metrics on macOS.

---

## Issue 6: Dual page entry points

**Files:** `src/page.tsx`  
**Root cause:** `src/page.tsx` is an orphan; App Router only uses `src/app/`. It can confuse future edits and may have drifted from `[[...panel]]/page.tsx`.

**Proposed fix:** Delete `src/page.tsx`.

**Risk:** None; not referenced by routing.

**Test:** `pnpm dev`, visit `/`; should still load `[[...panel]]` app.

---

## Execution order

1. ✅ Fix first-run auth (dev bypass) — done
2. ✅ Remove websocket debug fetch — done
3. ⏭️ Skip gateway health (no change)
4. ✅ Harden gateway reconnect and UI state — done
5. ✅ Make macOS status/metrics safe — done
6. ✅ Remove orphan `src/page.tsx` — done

### Dev login (after fix #1)

- **AUTH_PASS unset in dev**: Seeds `admin` / `dev`
- **AUTH_PASS=change-me-on-first-login in dev**: Seeds with that password (insecure default allowed for first-run)
