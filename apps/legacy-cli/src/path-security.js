const path = require("node:path");

function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function hasEncodedDotSegments(value) {
  return /%2e/i.test(value);
}

function resolveSandboxedPath(cwd, rawPath, label) {
  if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
    throw new Error(`${label} must be a non-empty path`);
  }

  if (hasControlCharacters(rawPath)) {
    throw new Error(`${label} must not contain control characters`);
  }

  if (rawPath.includes("?") || rawPath.includes("#")) {
    throw new Error(`${label} must not include query or hash fragments`);
  }

  if (hasEncodedDotSegments(rawPath)) {
    throw new Error(`${label} must not include percent-encoded dot segments`);
  }

  const resolvedCwd = path.resolve(cwd);
  const resolvedPath = path.resolve(resolvedCwd, rawPath);
  const relativePath = path.relative(resolvedCwd, resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} must stay within the current working directory`);
  }

  return resolvedPath;
}

module.exports = {
  resolveSandboxedPath
};
