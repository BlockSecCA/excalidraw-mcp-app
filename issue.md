# Excalidraw MCP App: Checkpoint Restore Bug Investigation

## Observed Behavior

When using `restoreCheckpoint` to modify an existing diagram, only the new elements render. The restored state from the checkpoint is missing.

**Repro steps:**
1. Call `create_view` with a simple diagram (3 boxes connected by arrows)
2. Tool returns checkpoint ID (e.g., "97axie")
3. Call `create_view` again with:
   ```json
   [
     {"type":"restoreCheckpoint","id":"97axie"},
     {"type":"rectangle","id":"b4",...new element...}
   ]
   ```
4. New render shows ONLY the new element, not the restored state

**Expected:** New render should show all original elements plus the new one.

**Actual:** New render shows only the new element. Bindings to non-existent elements (from restored state) are broken.

## Environment

- Claude Desktop (Windows)
- excalidraw-mcp-app installed via `.mcpb`
- Local stdio transport (not Vercel-hosted version)

## Investigation Areas

### 1. Client-side checkpoint storage
The checkpoint system stores diagram state client-side (in the iframe/browser context). Check:
- `src/` for how checkpoints are saved on `create_view` response
- Is localStorage/sessionStorage used? Does it persist across iframe instances?
- Each `create_view` likely creates a new iframe. Can the new iframe access the previous one's storage?

### 2. Checkpoint ID resolution
In `server.ts` or `main.ts`:
- How does `restoreCheckpoint` get processed?
- Is it passed to the client, or resolved server-side?
- If server-side, is there actually storage, or is it just an ID with no backing data?

### 3. Iframe lifecycle
Each tool call may spawn a fresh iframe. If checkpoint data lives in the previous iframe's JS context and that iframe is destroyed or inaccessible, restore fails.

### 4. Compare with Vercel-hosted behavior
Test the same repro against `https://excalidraw-mcp-app.vercel.app/mcp` via Claude.ai web. Does checkpoint restore work there? If yes, the bug is specific to local/stdio transport or `.mcpb` packaging.

## Files to Examine

```
excalidraw-mcp-app/
├── server.ts          # MCP server, tool handlers
├── main.ts            # Entry point, transport setup
├── src/
│   └── (client code)  # Excalidraw UI, checkpoint save/restore logic
├── mcp-app.html       # HTML resource served to host
└── dist/              # Built output
```

## Hypothesis

The checkpoint ID is returned to Claude but the actual diagram state is stored in the iframe's JavaScript memory. When a new `create_view` call happens, a new iframe is created. The new iframe cannot access the old iframe's memory, so `restoreCheckpoint` finds nothing and silently fails, rendering only the new elements.

If this is correct, possible fixes:
- Use postMessage to communicate with existing iframe instead of creating new one
- Store checkpoint data in a location accessible across iframe instances (host-mediated storage)
- Have server maintain checkpoint state (but this breaks the "stateless server" model)

## Output Requested

1. Confirm or refute the hypothesis
2. Identify the exact code path where restore fails
3. Propose fix or workaround
4. If unfixable in current architecture, document the limitation
