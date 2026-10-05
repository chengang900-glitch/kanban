# Keycloak Email Auto-Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution with focused tests and deployment verification.

**Goal:** Allow a verified Keycloak user to enter the existing active Metabase account with the same unique email on first login, then persist the normal `issuer + sub` identity binding.

**Architecture:** Keep the existing signed OIDC validation and stable `issuer + sub` lookup. On an unbound callback only, require a verified email claim and atomically resolve exactly one active Metabase user by case-insensitive email, then create `AuthIdentity` and `OssKeycloakBinding`. Existing bindings remain the fast path; missing, unverified, ambiguous, inactive, or conflicting identities continue to fail without account creation.

**Tech Stack:** Metabase v0.63.19 OSS customization, Clojure, Toucan2, PostgreSQL, existing Keycloak OIDC/PKCE flow.

## Global Constraints

- Preserve issuer, audience, signature, nonce, PKCE, session expiry, logout, and back-channel logout validation.
- Never auto-create a Metabase user or overwrite an existing identity binding.
- Match email case-insensitively using Metabase's `%lower.email` query and require `email_verified=true`.
- Preserve existing Metabase permissions and local password authentication.
- Keep existing explicit admin binding API and existing gavin/bi bindings compatible.

### Task 1: Add safe first-login auto-binding

**Files:**
- Modify: `src/metabase/sso/keycloak/store.clj`
- Modify: `src/metabase/sso/keycloak/integration.clj`
- Test: `test/metabase/sso/keycloak/store_test.clj`
- Test: `test/metabase/sso/keycloak/integration_test.clj`

**Interfaces:**
- Add `store/auto-bind-user!` consuming verified claims with `:iss`, `:sub`, `:email`, and `:email_verified`; return the same binding/user association shape as `store/bind-user!`.
- Change callback resolution to try existing `store/bound-user` first, then call `store/auto-bind-user!` only for an unbound identity.

- [ ] Add failing store tests for verified unique email auto-binding, missing/unverified email rejection, inactive user rejection, and existing identity/binding conflict.
- [ ] Add failing integration test proving an unbound verified claim creates a session for the matching existing user and retains the existing 403 for unsafe claims.
- [ ] Implement the transactional lookup and insert with `%lower.email`, active-user filtering, provider-id digest, and duplicate-key conversion to a sanitized 403/409 path.
- [ ] Run the focused store/integration tests and require zero failures/errors.

### Task 2: Update documentation and regression coverage

**Files:**
- Modify: `docs/keycloak-portal/README.md`
- Modify: `docs/keycloak-portal/VALIDATION.md`
- Test: existing focused protocol/store/integration suites

- [ ] Document first-login email auto-binding, the `email_verified` and unique-active-user safeguards, and the cases requiring administrator binding.
- [ ] Keep explicit binding API documentation for pre-provisioned or ambiguous accounts.
- [ ] Run Clojure lint for modified files and the complete Keycloak focused suite.

### Task 3: Build, deploy, and browser-verify

**Files:**
- Build artifact: `target/uberjar/metabase-v0.63.19-keycloak-<commit>.jar`
- Deployment: `/home/cntracer/metabase-linux` on `cntracer@122.224.218.82:5922`

- [ ] Verify clean git diff, build the OSS uberjar, and record SHA-256.
- [ ] Back up the current remote Metabase compose/env/JAR before deployment.
- [ ] Recreate only `metabase-linux`, wait for `/metabase/api/health` 200, and verify Discovery from the container.
- [ ] Use an existing Keycloak email-matched but unbound Metabase account, complete the browser login, and verify the embedded dashboard loads.
- [ ] Verify a second login reuses the persisted binding and that existing gavin/bi bindings remain intact.
