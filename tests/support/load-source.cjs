/* eslint-disable @typescript-eslint/no-require-imports -- Node's standalone test runner loads compiled TypeScript. */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const compiled = new Map();

function loadSource(overrides = {}) {
  const modules = new Map();
  // The App Router bundles next-intl's ESM exports. Its routing wrapper returns
  // the configuration, which can be passed through in the standalone CJS tests.
  const dependencies = {
    "next-intl/routing": { defineRouting: (config) => config },
    ...overrides,
  };

  function load(potentialPath) {
    const filename = [
      potentialPath,
      `${potentialPath}.ts`,
      path.join(potentialPath, "index.ts"),
    ].find((candidate) => fs.statSync(candidate, { throwIfNoEntry: false })?.isFile());
    if (!filename) throw new Error(`Cannot load ${potentialPath}`);

    if (!modules.has(filename)) {
      if (!compiled.has(filename)) {
        const { outputText } = ts.transpileModule(
          fs.readFileSync(filename, "utf8"),
          {
            fileName: filename,
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2022,
              esModuleInterop: true,
            },
          },
        );
        compiled.set(filename, new Function("require", "module", "exports", outputText));
      }

      const sourceModule = { exports: {} };
      modules.set(filename, sourceModule);
      compiled.get(filename)((specifier) => {
        if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
        if (specifier.startsWith("@/")) {
          return load(path.join(root, "src", specifier.slice(2)));
        }
        if (specifier.startsWith(".")) {
          return load(path.resolve(path.dirname(filename), specifier));
        }
        return require(specifier);
      }, sourceModule, sourceModule.exports);
    }

    return modules.get(filename).exports;
  }

  return (relativePath) => load(path.join(root, relativePath));
}

module.exports = { loadSource };
