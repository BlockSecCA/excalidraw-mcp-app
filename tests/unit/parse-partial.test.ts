/**
 * Unit tests for streaming JSON parsing logic.
 *
 * These functions parse partial/incomplete JSON during streaming tool input.
 * Critical for smooth diagram rendering as elements stream in.
 */
import { describe, it, expect } from "vitest";

// Copy of parsePartialElements from mcp-app.tsx
function parsePartialElements(str: string | undefined): any[] {
  if (!str?.trim().startsWith("[")) return [];
  try { return JSON.parse(str); } catch { /* partial */ }
  const last = str.lastIndexOf("}");
  if (last < 0) return [];
  try { return JSON.parse(str.substring(0, last + 1) + "]"); } catch { /* incomplete */ }
  return [];
}

// Copy of excludeIncompleteLastItem from mcp-app.tsx
function excludeIncompleteLastItem<T>(arr: T[]): T[] {
  if (!arr || arr.length === 0) return [];
  if (arr.length <= 1) return [];
  return arr.slice(0, -1);
}

describe("parsePartialElements", () => {
  it("parses complete JSON array", () => {
    const input = '[{"type":"rectangle","id":"r1"}]';
    expect(parsePartialElements(input)).toEqual([{ type: "rectangle", id: "r1" }]);
  });

  it("parses multiple complete elements", () => {
    const input = '[{"type":"rectangle","id":"r1"},{"type":"ellipse","id":"e1"}]';
    const result = parsePartialElements(input);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("rectangle");
    expect(result[1].type).toBe("ellipse");
  });

  it("recovers from incomplete last element", () => {
    const input = '[{"type":"rectangle","id":"r1"},{"type":"ellipse","id":"e';
    const result = parsePartialElements(input);
    expect(result).toEqual([{ type: "rectangle", id: "r1" }]);
  });

  it("recovers when last element is partially complete", () => {
    const input = '[{"type":"rectangle","id":"r1"},{"type":"ellipse"}';
    const result = parsePartialElements(input);
    // Should find the last } and close the array
    expect(result).toHaveLength(2);
  });

  it("returns empty for non-array input", () => {
    expect(parsePartialElements("{}")).toEqual([]);
    expect(parsePartialElements('{"type":"rect"}')).toEqual([]);
  });

  it("returns empty for undefined", () => {
    expect(parsePartialElements(undefined)).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parsePartialElements("")).toEqual([]);
  });

  it("returns empty for whitespace-only", () => {
    expect(parsePartialElements("   ")).toEqual([]);
  });

  it("handles array with just opening bracket", () => {
    expect(parsePartialElements("[")).toEqual([]);
  });

  it("handles array with incomplete first element", () => {
    expect(parsePartialElements('[{"type":"rect')).toEqual([]);
  });

  it("handles nested objects", () => {
    const input = '[{"type":"text","label":{"text":"Hello"}}]';
    const result = parsePartialElements(input);
    expect(result[0].label.text).toBe("Hello");
  });

  it("handles arrays within elements", () => {
    const input = '[{"type":"arrow","points":[[0,0],[100,100]]}]';
    const result = parsePartialElements(input);
    expect(result[0].points).toEqual([[0, 0], [100, 100]]);
  });

  it("handles special characters in strings", () => {
    const input = '[{"type":"text","text":"Hello\\nWorld"}]';
    const result = parsePartialElements(input);
    expect(result[0].text).toBe("Hello\nWorld");
  });
});

describe("excludeIncompleteLastItem", () => {
  it("returns empty for empty array", () => {
    expect(excludeIncompleteLastItem([])).toEqual([]);
  });

  it("returns empty for single-element array", () => {
    expect(excludeIncompleteLastItem([1])).toEqual([]);
  });

  it("returns all but last for two elements", () => {
    expect(excludeIncompleteLastItem([1, 2])).toEqual([1]);
  });

  it("returns all but last for many elements", () => {
    expect(excludeIncompleteLastItem([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4]);
  });

  it("handles objects", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = excludeIncompleteLastItem(input);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("handles null/undefined gracefully", () => {
    expect(excludeIncompleteLastItem(null as any)).toEqual([]);
    expect(excludeIncompleteLastItem(undefined as any)).toEqual([]);
  });
});

describe("streaming simulation", () => {
  it("simulates progressive element streaming", () => {
    // Simulate how elements stream during tool generation
    const snapshots = [
      '[{"type":"rect',
      '[{"type":"rectangle","id":"r1"}',
      '[{"type":"rectangle","id":"r1"},{"type":"ell',
      '[{"type":"rectangle","id":"r1"},{"type":"ellipse","id":"e1"}',
      '[{"type":"rectangle","id":"r1"},{"type":"ellipse","id":"e1"},{"type":"arrow","id":"a1"}]',
    ];

    const results = snapshots.map((s) => {
      const parsed = parsePartialElements(s);
      return excludeIncompleteLastItem(parsed);
    });

    // First snapshot: incomplete first element
    expect(results[0]).toEqual([]);

    // Second: one complete element, drop it (might be incomplete)
    expect(results[1]).toEqual([]);

    // Third: one complete, one incomplete -> keep zero (only 1 parsed)
    expect(results[2]).toEqual([]);

    // Fourth: two complete -> keep first
    expect(results[3]).toEqual([{ type: "rectangle", id: "r1" }]);

    // Fifth: three complete (final) -> keep first two
    expect(results[4]).toEqual([
      { type: "rectangle", id: "r1" },
      { type: "ellipse", id: "e1" },
    ]);
  });
});
