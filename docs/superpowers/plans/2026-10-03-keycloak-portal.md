# OSS Keycloak Portal Implementation Plan

> For agentic workers: execute this approved plan inline, task by task. No delegation or further design approval is required by the user. The user authorized implementation on 2026-10-03.

**Goal:** Independently add explicit per-user Keycloak OIDC to the customized OSS workspace and controlled same-origin iframe integration with LibreChat.

**Architecture:** Reuse OSS discovery, encrypted-state and session primitives. Persist consumed login transactions, external-session associations and logout-token replay markers. Never use email auto-linking or Enterprise implementation.

**Tech Stack:** Clojure/Ring/Toucan2/Liquibase, existing Buddy RSA validation, React/TypeScript, Keycloak OIDC, same-origin proxy.

## Global Constraints

- Baseline 0f3ecb18873c5d47b5b67eddcc33bd0cccec1d74, branch customization/v0.63.19-keycloak-portal.
- Existing accounts are bound by an administrator; no auto-provisioning or group/privilege sync.
- No production database, deployment, remote push or Enterprise feature enablement.
- Origin/nonce/state/PKCE checks are mandatory; secrets and bearer tokens are never returned to the portal.
- Normal Metabase cookies and permissions remain authoritative; iframe is not a security boundary.
- New migration file is additive; no upstream changeset is edited.

## Task 1: Configuration, protocol validation, persistent models

Files: src/metabase/sso/keycloak/{settings,protocol,models,store}.clj; resources/migrations/063/20261003_oss_keycloak.yaml; test/metabase/sso/keycloak/{protocol,store}_test.clj.

Interfaces: settings/enabled?, settings/configuration; protocol/validate-id-token and protocol/validate-logout-token return verified claims or throw status-coded errors. store/bind-user!, store/consume-login!, store/revoke! operate atomically against app DB.

- [ ] Write negative protocol tests for issuer/audience/azp/exp/iat/nonce and missing sub/sid, signed RSA tokens and wrong keys.
- [ ] Write database tests for duplicate binding, same email/different sub, concurrent state consumption, expiry and sid-scoped logout.
- [ ] Implement fixed issuer validation, same-origin discovery endpoint checks, RS256 allowlist and bounded JWKS retry.
- [ ] Implement one-use hashed state and one-use hashed logout jti records, plus external-session expiry.
- [ ] Run `clojure -X:dev:test :only '[metabase.sso.keycloak.protocol-test metabase.sso.keycloak.store-test]' :multithread? false` and require zero failures/errors.

## Task 2: Browser OIDC and administrator bindings

Files: src/metabase/sso/keycloak/integration.clj; src/metabase/sso/api/keycloak.clj; src/metabase/server/auth_wrapper.clj; src/metabase/sso/init.clj; test/metabase/sso/keycloak/integration_test.clj.

Interfaces: GET /auth/keycloak/login; GET /auth/keycloak/callback; POST /auth/keycloak/logout; POST /auth/keycloak/backchannel-logout; admin GET/POST /auth/keycloak/bindings and DELETE /auth/keycloak/bindings/:id. Return path is a fixed configured relative portal path.

- [ ] Write full handler tests for disabled configuration, exact callback/state cookie, unknown identities, malformed callbacks, replay and previous browser session deletion.
- [ ] Build PKCE state using `(protocol/pkce-challenge verifier)`, encrypt cookie with `oidc.state/encrypt-state`, store only state hash/expiry.
- [ ] Consume state once before token exchange; authorize only `(store/bound-user claims)` without calling generic email-based login orchestration.
- [ ] Create original OSS tracked session in a transaction, add issuer/sub/sid/expiry association, then set original SESSION cookie.
- [ ] Add origin-checked admin binding mutations and origin-checked POST logout; accept back-channel events only with verified logout token.
- [ ] Run integration tests including direct protected API access after logout/expiry, and unchanged password login.

## Task 3: Same-origin safety and login UX

Files: src/metabase/server/middleware/security.clj; src/metabase/server/middleware/session.clj; frontend/src/metabase/auth/components/Login/Login.tsx; frontend/src/metabase-types/api/settings.ts; focused tests beside modified components and server middleware.

- [ ] Assert default headers still deny framing; only the explicit OSS flag changes to self/SAMEORIGIN.
- [ ] Add per-request expiry/disabled-provider check for authenticated oss-keycloak sessions without affecting password/API-key/OAuth precedence.
- [ ] Expose only enabled boolean to login properties; add native top-level Keycloak anchor using current site-url base path.
- [ ] Assert nested /metabase login URL, hidden disabled button and retained password entry.
- [ ] Run `bun run test-unit --runInBand --coverage=false frontend/src/metabase/auth/components/Login/tests` and TypeScript check.

## Task 4: LibreChat patch and isolated browser acceptance

Files: docs/keycloak-portal/librechat.patch; docs/keycloak-portal/Caddyfile.example; docs/keycloak-portal/metabase.env.example; docs/keycloak-portal/README.md; local scripts/test data under bin/keycloak-portal/ and test-resources where needed.

- [ ] Generate minimal patch against inspected LibreChat DataCenter route, using existing hooks, localized text and semantic styling; no external source tree is modified without testing in an isolated copy.
- [ ] Validate `git apply --check` against inspected source. Include fresh OIDC navigation, session-loss state and identity-switch frame reset, without passing token material to browser messages.
- [ ] Configure loopback isolated Metabase and OIDC test server with two accounts; serve parent and /metabase through same-origin proxy.
- [ ] Browser-check login redirects, protected workspaces, same-origin framing, wrong-origin rejection, refresh, save/export and logout. Record mock-provider evidence separately from genuine Keycloak evidence.

## Task 5: Regression, OSS build and delivery

Files: docs/keycloak-portal/VALIDATION.md; METABASE_CUSTOMIZATION_PLAN.md; METABASE_UPGRADE_CHECKLIST.md.

- [ ] Run targeted auth/session/security/OIDC tests, Clojure lint and module-boundary tests; fix only failures attributable to this extension.
- [ ] Run frontend tests, lint/typecheck, then `./bin/build.sh '{:edition :oss}'` with Java 25 and installed runtime paths.
- [ ] Verify ZIP integrity, manifest/version, AGPL-only extension packaging and SHA-256; launch with temporary H2 and loopback port.
- [ ] Record exact commands, source SHA, test counts and browser evidence; list genuine Keycloak/LibreChat and PostgreSQL acceptance gaps explicitly.
- [ ] Commit tested changes locally and report branch, artifact and deployment boundary. No remote push.
