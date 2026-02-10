/**
 * Mock for @modelcontextprotocol/ext-apps/react
 *
 * Simulates Claude Desktop host environment for testing.
 * Exposes test controls to simulate tool input/output and verify SDK calls.
 */

export interface MockApp {
  app: any;
  simulateToolInput(params: any): void;
  simulateToolInputPartial(params: any): void;
  simulateToolResult(params: any): void;
  simulateHostContextChanged(ctx: any): void;
  getUpdateModelContextCalls(): any[];
  getSendLogCalls(): any[];
  reset(): void;
}

export function createMockApp(): MockApp {
  const callbacks: {
    ontoolinput?: (params: any) => void;
    ontoolinputpartial?: (params: any) => void;
    ontoolresult?: (params: any) => void;
    onhostcontextchanged?: (params: any) => void;
    onteardown?: () => any;
    onerror?: (err: any) => void;
  } = {};

  let updateModelContextCalls: any[] = [];
  let sendLogCalls: any[] = [];

  const app = {
    set ontoolinput(cb: any) { callbacks.ontoolinput = cb; },
    get ontoolinput() { return callbacks.ontoolinput; },
    set ontoolinputpartial(cb: any) { callbacks.ontoolinputpartial = cb; },
    get ontoolinputpartial() { return callbacks.ontoolinputpartial; },
    set ontoolresult(cb: any) { callbacks.ontoolresult = cb; },
    get ontoolresult() { return callbacks.ontoolresult; },
    set onhostcontextchanged(cb: any) { callbacks.onhostcontextchanged = cb; },
    get onhostcontextchanged() { return callbacks.onhostcontextchanged; },
    set onteardown(cb: any) { callbacks.onteardown = cb; },
    get onteardown() { return callbacks.onteardown; },
    set onerror(cb: any) { callbacks.onerror = cb; },
    get onerror() { return callbacks.onerror; },

    updateModelContext: async (params: any) => {
      updateModelContextCalls.push(params);
      return {};
    },
    sendLog: async (params: any) => {
      sendLogCalls.push(params);
    },
    getHostContext: () => ({
      displayMode: "inline",
      toolInfo: { id: "test-tool-call-id" },
    }),
    requestDisplayMode: async (params: any) => ({ mode: params.mode }),
  };

  return {
    app,
    simulateToolInput: (params) => callbacks.ontoolinput?.(params),
    simulateToolInputPartial: (params) => callbacks.ontoolinputpartial?.(params),
    simulateToolResult: (params) => callbacks.ontoolresult?.(params),
    simulateHostContextChanged: (ctx) => callbacks.onhostcontextchanged?.(ctx),
    getUpdateModelContextCalls: () => updateModelContextCalls,
    getSendLogCalls: () => sendLogCalls,
    reset: () => {
      updateModelContextCalls = [];
      sendLogCalls = [];
    },
  };
}

// Global mock instance for browser tests
let globalMock: MockApp | null = null;

export function useApp(_options?: any) {
  if (!globalMock) {
    globalMock = createMockApp();
    // Expose to window for test control
    if (typeof window !== "undefined") {
      (window as any).__testMock = globalMock;
    }
  }
  return {
    app: globalMock.app,
    error: null,
    isConnected: true,
  };
}

// For Node.js/Vitest: reset between tests
export function resetMock() {
  globalMock = null;
}

export function getMock(): MockApp | null {
  return globalMock;
}
