# MuscleWiki Video Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-automation workflow that reads action names from the Excel sheet, finds exact-name matches on MuscleWiki, and writes success/failure manifests before any downloads.

**Architecture:** Use a small Node.js CLI with focused modules for reading the Excel source, matching exact results, extracting video links, and writing JSON/CSV manifests. Cover the pure data logic with automated tests first, then integrate browser automation for the live site workflow.

**Tech Stack:** Node.js, Playwright, built-in `node:test`, local JSON/CSV outputs

---

### Task 1: Project skeleton and tests

**Files:**
- Create: `package.json`
- Create: `src/readWorkbook.js`
- Create: `src/manifest.js`
- Create: `tests/readWorkbook.test.js`
- Create: `tests/manifest.test.js`

- [ ] Step 1: Write failing tests for workbook parsing and manifest writing
- [ ] Step 2: Run the targeted test command and verify the failures are expected
- [ ] Step 3: Implement the minimal workbook and manifest modules
- [ ] Step 4: Run the targeted test command and verify it passes

### Task 2: Exact-match collection logic

**Files:**
- Create: `src/matchers.js`
- Create: `tests/matchers.test.js`

- [ ] Step 1: Write failing tests for exact-name matching and download naming
- [ ] Step 2: Run the targeted test command and verify the failures are expected
- [ ] Step 3: Implement the minimal matching helpers
- [ ] Step 4: Run the targeted test command and verify it passes

### Task 3: Browser automation entrypoint

**Files:**
- Create: `src/collect-musclewiki-manifest.js`
- Modify: `package.json`

- [ ] Step 1: Add a failing integration-oriented smoke test only for argument validation if feasible
- [ ] Step 2: Install required runtime dependencies
- [ ] Step 3: Implement the Playwright collection flow and manifest outputs
- [ ] Step 4: Run unit tests plus a syntax check for the collector script

### Task 4: Verification

**Files:**
- Verify: `docs/superpowers/plans/2026-03-23-musclewiki-video-manifest.md`
- Verify: `src/*.js`
- Verify: `tests/*.test.js`

- [ ] Step 1: Run the full automated test suite
- [ ] Step 2: Run a fresh syntax check for the collector entrypoint
- [ ] Step 3: Report the verified status and note any live-site/runtime blockers
