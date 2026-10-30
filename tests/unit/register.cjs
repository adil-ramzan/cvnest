// Resolves the "@/..." import alias for unit tests compiled by tsconfig.test.json.
const Module = require("node:module");
const path = require("node:path");

const srcRoot = path.join(__dirname, "..", "..", ".test-build", "src");
const resolve = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
  const target = request.startsWith("@/") ? path.join(srcRoot, request.slice(2)) : request;
  return resolve.call(this, target, ...rest);
};
