# Checkpoint Restore Fix

**Original PR:** https://github.com/antonpk1/excalidraw-mcp-app/pull/6 (closed — upstream used different approach)
**Date:** 2026-02-07

## Problem

Checkpoint restore fails on subsequent tool calls. The first diagram renders correctly and creates a checkpoint ID, but when the model tries to restore that checkpoint in a follow-up request, the diagram appears blank.

### Root Cause

**Iframe localStorage isolation.**

Each MCP tool call runs the widget in a fresh iframe. The original implementation stored checkpoints in `localStorage`, but:
- Tool call 1: Widget saves checkpoint to localStorage in iframe A
- Tool call 2: Widget runs in iframe B with its own isolated localStorage
- `restoreCheckpoint` looks up the ID → not found → returns empty state

## This Fork's Fix

Move checkpoint storage from client-side localStorage to server-side in-memory `Map`.

- **Server (`server.ts`):** `checkpointStore: Map<string, object>` persists across tool calls
- **Widget (`mcp-app.tsx`):** Reads restored elements from `ontoolresult` instead of localStorage

### Trade-offs

| | This fork | Upstream |
|---|---|---|
| Storage | In-memory Map | Redis (remote) / File (local) |
| Persistence | Session only | Across sessions |
| Cleanup | Automatic (process exit) | Manual / TTL |
| Disk artifacts | None | `$TMPDIR/excalidraw-mcp-checkpoints/` |

This approach works reliably in **stdio mode** (single persistent process). Checkpoints don't survive process restarts, but no temp files are left behind.

## Upstream's Alternative

The original author implemented server-side storage with multiple backends:
- `FileCheckpointStore` — JSON files in temp directory (stdio mode)
- `RedisCheckpointStore` — Upstash/Vercel KV with 30-day TTL (Vercel)
- `MemoryCheckpointStore` — Fallback for warm containers

See [upstream PR #11](https://github.com/antonpk1/excalidraw-mcp-app/pull/11) for details.
