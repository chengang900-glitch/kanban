# Metabot Execution Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the official v0.63.2 chat behavior while adding a safe collapsed execution-details panel and explicit failure handling.

**Architecture:** Keep provider reasoning parsing at the OpenAI-compatible adapter boundary, then filter reasoning before SSE output and persistence. Build execution summaries from frontend tool-call records using an allowlist extractor, and surface max-iteration and non-composable SQL Server source-card failures as structured errors.

**Tech Stack:** Clojure, TypeScript, React, Mantine, Jest, Clojure test.

## Global Constraints

- Apply the same source changes to `metabase-v0.63.2` and `metabase-v0.63.2-0809`.
- Keep the official dots loader, short tool status messages, and brief final answer behavior.
- Never render or persist new raw `reasoning_content`.
- Do not expose raw SQL, full tool JSON, or full tool results in “执行详情”.
- Build both artifacts as exactly `v0.63.2`; deploy only the 0809 artifact without a backup.

---

### Task 1: Filter raw reasoning

**Files:**
- Modify: `src/metabase/metabot/api.clj`
- Modify: `frontend/src/metabase/metabot/state/actions.ts`
- Modify: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.tsx`
- Test: `test/metabase/metabot/api_test.clj`
- Test: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.unit.spec.tsx`

**Interfaces:**
- Consumes: internal parts with `{:type :reasoning}`.
- Produces: SSE/persisted parts without reasoning; legacy reasoning messages remain non-visible.

- [ ] Add a failing backend test asserting streamed/persisted output excludes a reasoning part while retaining text and tool parts.
- [ ] Add a failing frontend test asserting legacy reasoning is hidden in normal and debug rendering.
- [ ] Add `(remove #(= :reasoning (:type %)))` before the API tee/formatter and remove the live reasoning dispatch callback.
- [ ] Change message visibility so reasoning is never rendered, while retaining its type for backward-compatible history payloads.
- [ ] Run the focused backend and frontend tests and require PASS.

### Task 2: Add safe execution details

**Files:**
- Create: `frontend/src/metabase/metabot/components/MetabotChat/MetabotExecutionDetails.tsx`
- Create: `frontend/src/metabase/metabot/components/MetabotChat/execution-details.ts`
- Create: `frontend/src/metabase/metabot/components/MetabotChat/execution-details.unit.spec.ts`
- Modify: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.tsx`
- Modify: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChat.module.css`
- Test: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.unit.spec.tsx`

**Interfaces:**
- Consumes: `MetabotDebugToolCallMessage[]` from one assistant turn.
- Produces: `ExecutionDetailItem[]` containing only `source`, `filter`, `group`, `result`, or `error` labels and sanitized text.

- [ ] Write failing extractor tests for source-card/source-table, filters, grouping, successful tools, errors, raw SQL, `_reasoning`, long text, and malformed JSON.
- [ ] Implement recursive allowlist extraction with deduplication, control-character removal, and bounded text lengths.
- [ ] Write a failing render test for one default-collapsed panel per completed assistant turn.
- [ ] Implement the Mantine collapsed panel and anchor it after the last visible agent message of the turn.
- [ ] Verify raw reasoning, SQL, and raw JSON are absent from the rendered panel.

### Task 3: Surface max-iteration termination

**Files:**
- Modify: `src/metabase/metabot/agent/core.clj`
- Modify: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.tsx`
- Test: `test/metabase/metabot/agent/core_test.clj`
- Test: `frontend/src/metabase/metabot/components/MetabotChat/MetabotChatMessage.unit.spec.tsx`

**Interfaces:**
- Produces: error part with `:error-code :metabot_max_iterations` when `finish-reason` is `:max-iterations`.
- Frontend maps that code to a concise retryable message.

- [ ] Write a failing loop test using repeated tool calls through the profile iteration limit.
- [ ] Emit the typed error before final state only for `:max-iterations`.
- [ ] Write and pass a frontend test for the specific user-facing error.

### Task 4: Reject non-composable SQL Server DECLARE sources

**Files:**
- Modify: `src/metabase/metabot/tools/construct.clj`
- Test: `test/metabase/metabot/tools/construct_representations_test.clj`

**Interfaces:**
- Consumes: first-stage source-card metadata and its native SQL.
- Produces: `:agent-error?` with `:error :non-composable-native-source` before chart success.

- [ ] Write a failing test with a SQL Server native model beginning with comments/whitespace and `DECLARE`, plus an outer filter/group stage.
- [ ] Resolve the source card and reject only the SQL Server `DECLARE` composition case; preserve ordinary native models and other drivers.
- [ ] Assert no chart-success structured output is returned for the invalid case.

### Task 5: Synchronize, test, build, and deploy

**Files:**
- Modify: the corresponding files under both source roots.
- Read before deployment: `/Users/chengang/.codex/skills/deploy-metabase-linux/references/acceptance.md`

**Interfaces:**
- Produces: two verified `metabase.jar` files; deploys only the 0809 JAR.

- [ ] Apply the reviewed patch to `metabase-v0.63.2` without touching unrelated dirty files.
- [ ] Run focused Jest and Clojure tests in each tree and require PASS.
- [ ] Build both trees with version exactly `v0.63.2`; verify ZIP integrity, embedded version, SHA-256, and size.
- [ ] Preflight server state, upload the 0809 JAR, stop/replace/start only the service JAR without backup, preserving PostgreSQL and environment configuration.
- [ ] Require active/enabled service, zero restarts, clean initialization, PostgreSQL 18 connectivity, and HTTP 200 health checks.

