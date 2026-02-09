# Checkpoint Restore Fix

**PR:** https://github.com/antonpk1/excalidraw-mcp-app/pull/6
**Date:** 2026-02-07
**Affected clients:** Claude for Windows (tested on 1.1.2321 with Opus 4.5 Extended)

## Problem

Checkpoint restore fails on subsequent tool calls. The first diagram renders correctly and creates a checkpoint ID, but when the model tries to restore that checkpoint in a follow-up request, the diagram appears blank.

### Reproduction

1. Ask Claude to draw a simple diagram using Excalidraw MCP
2. Diagram renders, checkpoint ID assigned (e.g., "97axie")
3. Ask Claude to add a new element to the diagram
4. Model sends `{"type":"restoreCheckpoint","id":"97axie"}` as first element
5. **Bug:** Restored state is empty — only the new element appears, not the original diagram

### Workaround (before fix)

Ask Claude to redo using the original Excalidraw JSON instead of checkpoint restore. Works but wastes tokens since the full element array must be re-sent.

## Root Cause

**Iframe localStorage isolation.**

Each MCP tool call runs the widget in a fresh iframe. The original implementation stored checkpoints in `localStorage`, but:
- Tool call 1: Widget saves checkpoint to localStorage in iframe A
- Tool call 2: Widget runs in iframe B with its own isolated localStorage
- `restoreCheckpoint` looks up the ID → not found → returns empty state

The storage isolation is a browser security feature, not a bug — but it breaks cross-tool-call persistence.

## Fix

Move checkpoint storage from client-side localStorage to server-side in-memory `Map`.

### Changes

1. **Server (`server.ts`):** Add `checkpointStore: Map<string, object>` that persists across tool calls
2. **Server:** On `create_view`, store checkpoint in the Map; return stored elements via `structuredContent` on restore
3. **Widget (`mcp-app.tsx`):** Read restored elements from `ontoolresult` instead of localStorage

### Commits

- `426202d` — Server-side storage implementation
- `fb7e0f1` — Fix label rendering (server returns raw elements, widget must run `convertToExcalidrawElements`)
- `1dc2d69` — Remove investigation files

## Limitation

This fix uses an in-memory `Map`, which works reliably in **stdio mode** (single persistent process).

For **HTTP mode on Vercel** (serverless), checkpoint persistence isn't guaranteed — each request may hit a cold start with a fresh `Map`. A robust serverless solution would need external storage (Redis, KV store, etc.).

The original localStorage bug affects both modes equally (iframe isolation is client-side), but this fix only fully resolves it for stdio/persistent server deployments.
