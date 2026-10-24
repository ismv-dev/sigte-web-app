import test, { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

export { describe, it, test, beforeEach, afterEach, before as beforeAll, after as afterAll };

export function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toContain(item) {
      if (Array.isArray(actual) || typeof actual === "string") {
        assert.ok(actual.includes(item), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      } else {
        assert.ok(item in actual);
      }
    },
    toThrow(err) {
      assert.throws(actual, err);
    },
    resolves: {
      toBe(expected) {
        return Promise.resolve(actual).then((val) => assert.strictEqual(val, expected));
      },
      toEqual(expected) {
        return Promise.resolve(actual).then((val) => assert.deepStrictEqual(val, expected));
      },
    },
    rejects: {
      toThrow(err) {
        return assert.rejects(actual, err);
      },
    },
    toBeGreaterThan(n) {
      assert.ok(actual > n, `Expected ${actual} > ${n}`);
    },
    toBeLessThan(n) {
      assert.ok(actual < n, `Expected ${actual} < ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      assert.ok(actual >= n, `Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual(n) {
      assert.ok(actual <= n, `Expected ${actual} <= ${n}`);
    },
    toHaveLength(len) {
      assert.strictEqual(actual.length, len);
    },
    toMatch(regex) {
      assert.ok(regex.test(actual), `Expected "${actual}" to match ${regex}`);
    },
    not: {
      toBe(expected) {
        assert.notStrictEqual(actual, expected);
      },
      toEqual(expected) {
        assert.notDeepStrictEqual(actual, expected);
      },
      toBeNull() {
        assert.notStrictEqual(actual, null);
      },
      toBeUndefined() {
        assert.notStrictEqual(actual, undefined);
      },
      toContain(item) {
        assert.ok(!actual.includes(item));
      },
      toThrow(err) {
        assert.doesNotThrow(actual, err);
      },
    },
  };
}

const originalEnv = { ...process.env };
const stubbedEnvs = [];

export const vi = {
  fn: (impl) => {
    const f = (...args) => {
      f.mock.calls.push(args);
      if (impl) return impl(...args);
    };
    f.mock = { calls: [] };
    return f;
  },
  stubEnv: (key, value) => {
    stubbedEnvs.push(key);
    process.env[key] = value;
  },
  unstubAllEnvs: () => {
    for (const key of stubbedEnvs) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
    stubbedEnvs.length = 0;
  },
  resetModules: () => {},
};
