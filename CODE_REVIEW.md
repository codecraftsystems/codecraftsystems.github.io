# Full Code Review

Date: 2026-03-12
Reviewer: Codex (GPT-5.2-Codex)

## Scope
- Static review of repository structure, client-side JavaScript, and key integration flows.
- Focus areas: security, reliability, maintainability, UX resilience, and deployment readiness.

## Executive Summary
The project is well-organized for a static-site + Supabase workflow, but there are **high-risk security issues** in current client-side AI integration. Most importantly, the Google Gemini API key is embedded in browser code, making it publicly extractable and abusable. There are also a few HTML injection surfaces where untrusted data is inserted with `innerHTML`.

## Findings

### 1) Critical — Exposed Gemini API key in browser-side code
**Evidence**
- `find-jobs-with-ai/index.js` builds API key from fragments and calls Gemini directly from client. 
- `submit-profile/ai-profile-generator.js` does the same and stores key in a globally accessible object.

**Risk**
- Key can be copied from DevTools/source maps/network requests.
- Quota theft, unexpected billing, key revocation churn, and service disruption.

**Recommendation**
- Move LLM calls to a server-side endpoint (Supabase Edge Function or backend API).
- Keep API key in server secrets only.
- Add per-user rate limiting and abuse controls at server boundary.

---

### 2) High — HTML injection surface via raw `innerHTML`
**Evidence**
- `setStatus()` writes `desc` using `innerHTML`.
- `renderTips()` writes model output using `innerHTML` after only markdown replacement.

**Risk**
- If any untrusted string reaches these paths, attacker-controlled HTML can execute (XSS).

**Recommendation**
- Use `textContent` for plain text.
- If rich text is required, sanitize with a strict allowlist sanitizer before insertion.
- Keep model output treated as untrusted input.

---

### 3) Medium — Inconsistent sanitization strategy across rendering paths
**Evidence**
- Some rendering paths use escaping helpers (good), while others assign raw HTML.

**Risk**
- Future refactors can accidentally route untrusted values into unsafe sinks.

**Recommendation**
- Create one rendering utility policy: 
  - default `textContent`
  - explicit `safeHtml()` wrapper only for pre-sanitized content.
- Add lint rule / code review checklist for `innerHTML` usage.

---

### 4) Medium — Frontend business logic coupled to external AI response shape
**Evidence**
- Job parsing assumes strict JSON structure from LLM and then post-normalizes.

**Risk**
- Runtime failures or silent degradations when model output drifts.

**Recommendation**
- Validate AI response against a schema (e.g., Zod/JSON schema) server-side.
- Return normalized, deterministic payload to frontend.

---

### 5) Low — Repo lacks automated quality gates
**Evidence**
- No obvious lint/test pipeline in repository root.

**Risk**
- Security regressions and rendering bugs can slip to production.

**Recommendation**
- Add lightweight CI with:
  - JS linting
  - basic static analysis for secret detection and unsafe DOM APIs
  - optional link/HTML validation for static pages.

## Priority Action Plan
1. **Immediate (P0):** Remove exposed Gemini key from client code; rotate compromised key.
2. **P1:** Introduce server-side AI proxy with authentication + rate limits.
3. **P1:** Replace unsafe `innerHTML` sinks or sanitize strictly.
4. **P2:** Add schema validation for AI responses.
5. **P2:** Add CI lint/security checks.

## Positive Notes
- Good modular separation for directory utilities (`assets/developers.js`).
- Several rendering paths already use escaping helpers and safe URL normalization.
- Session objects appear intentionally minimal (no auth token persisted in shown paths).
