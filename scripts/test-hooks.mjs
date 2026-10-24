import { isBuiltin } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";

const rootDir = process.cwd();
const shimUrl = pathToFileURL(join(rootDir, "scripts", "vitest-shim.mjs")).href;
const nextServerBridgeUrl = pathToFileURL(join(rootDir, "scripts", "next-server-bridge.mjs")).href;

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"];

function tryExtensions(filePath) {
  if (existsSync(filePath)) {
    try {
      if (statSync(filePath).isFile()) return filePath;
    } catch {}
  }
  for (const ext of EXTENSIONS) {
    const candidate = filePath + ext;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of EXTENSIONS) {
    const candidate = join(filePath, "index" + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "vitest") {
    return {
      url: shimUrl,
      shortCircuit: true,
    };
  }

  if (specifier === "next/server") {
    return {
      url: nextServerBridgeUrl,
      shortCircuit: true,
    };
  }

  if (specifier === "next/headers") {
    const target = join(rootDir, "node_modules", "next", "headers.js");
    if (existsSync(target)) {
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
  }

  if (isBuiltin(specifier)) {
    return nextResolve(specifier, context);
  }

  // Handle @/ alias
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    const target = join(rootDir, "src", subpath);
    const resolved = tryExtensions(target);
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  // Handle relative imports without extensions
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentFile = context.parentURL ? fileURLToPath(context.parentURL) : rootDir;
    const parentDir = dirname(parentFile);
    const target = pathResolve(parentDir, specifier);
    const resolved = tryExtensions(target);
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true,
      };
    }
  }

  return nextResolve(specifier, context);
}
