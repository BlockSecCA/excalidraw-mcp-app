/**
 * E2E tests for widget loading in browser environment.
 *
 * These tests verify that:
 * 1. The built HTML artifact loads without errors
 * 2. Import maps resolve correctly
 * 3. No CSP violations occur
 * 4. Required DOM elements are created
 */
import { test, expect } from "@playwright/test";

test.describe("Widget Loading", () => {
  test("dist/mcp-app.html loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      } else if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await page.goto("/dist/mcp-app.html", { waitUntil: "networkidle" });

    // Filter out expected errors (SDK not connected, network issues in test env)
    const unexpectedErrors = errors.filter(
      (e) =>
        !e.includes("ext-apps") &&
        !e.includes("MCP") &&
        !e.includes("Not connected") && // SDK not connected (expected in test)
        !e.includes("Failed to fetch") && // CDN timeouts in CI
        !e.includes("Failed to load resource") && // Network errors
        !e.includes("net::ERR_") // Chrome network errors
    );

    expect(unexpectedErrors).toEqual([]);
  });

  test("root element exists", async ({ page }) => {
    await page.goto("/dist/mcp-app.html");
    const root = await page.$("#root");
    expect(root).toBeTruthy();
  });

  test("import map is valid JSON", async ({ page }) => {
    await page.goto("/dist/mcp-app.html");

    const importMapContent = await page.evaluate(() => {
      const script = document.querySelector('script[type="importmap"]');
      if (!script) return null;
      try {
        return JSON.parse(script.textContent || "");
      } catch {
        return "INVALID_JSON";
      }
    });

    expect(importMapContent).not.toBeNull();
    expect(importMapContent).not.toBe("INVALID_JSON");
    expect(importMapContent.imports).toBeDefined();
  });

  test("required imports are defined", async ({ page }) => {
    await page.goto("/dist/mcp-app.html");

    const imports = await page.evaluate(() => {
      const script = document.querySelector('script[type="importmap"]');
      if (!script) return null;
      const map = JSON.parse(script.textContent || "{}");
      return map.imports || {};
    });

    expect(imports).toBeDefined();
    expect(imports["react"]).toContain("esm.sh");
    expect(imports["react-dom"]).toContain("esm.sh");
    expect(imports["@excalidraw/excalidraw"]).toContain("esm.sh");
    expect(imports["morphdom"]).toContain("esm.sh");
  });
});

test.describe("CSP Compliance", () => {
  test("no CSP violations with restricted policy", async ({ page }) => {
    const cspViolations: string[] = [];

    // Intercept and add CSP headers matching Claude Desktop
    await page.route("**/dist/mcp-app.html", async (route) => {
      const response = await route.fetch();
      const body = await response.text();

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body,
        headers: {
          "Content-Security-Policy": [
            "default-src 'self'",
            "script-src 'self' https://esm.sh 'unsafe-inline'",
            "style-src 'self' https://esm.sh 'unsafe-inline'",
            "font-src 'self' https://esm.sh data:",
            "connect-src 'self' https://esm.sh",
            "img-src 'self' blob: data:",
          ].join("; "),
        },
      });
    });

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("Content Security Policy") ||
        text.includes("Refused to")
      ) {
        cspViolations.push(text);
      }
    });

    await page.goto("/dist/mcp-app.html", { waitUntil: "networkidle" });

    // Give time for async modules to load
    await page.waitForTimeout(2000);

    expect(cspViolations).toEqual([]);
  });
});

test.describe("Network Dependencies", () => {
  test("identifies external network requests", async ({ page }) => {
    const externalRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("http://localhost") && !url.startsWith("data:")) {
        externalRequests.push(url);
      }
    });

    await page.goto("/dist/mcp-app.html", { waitUntil: "networkidle" });

    // Log external requests for visibility
    console.log("External requests:", externalRequests);

    // All external requests should be to esm.sh (allowed by CSP)
    for (const url of externalRequests) {
      expect(url).toContain("esm.sh");
    }
  });

  test("graceful handling when CDN is blocked", async ({ page }) => {
    // Block all esm.sh requests
    await page.route("**/esm.sh/**", (route) => route.abort("blockedbyclient"));

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/dist/mcp-app.html", { waitUntil: "domcontentloaded" });

    // Widget should at least not crash completely
    const root = await page.$("#root");
    expect(root).toBeTruthy();

    // There will be errors, but the page shouldn't throw unhandled exceptions
    // that prevent any rendering
  });
});
