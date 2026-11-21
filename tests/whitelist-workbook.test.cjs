/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const { loadSource } = require("./support/load-source.cjs");
const load = loadSource();
const { readWhitelistFile } = load("src/core/event/whitelist-file.ts");
const { previewWhitelistImport, replaceWhitelist } = load(
  "src/core/event/whitelist.ts",
);

test("rejects corrupt workbooks and unsupported uploads before preview", async () => {
  for (const name of ["invalid.xlsx", "invalid.xls"]) {
    await assert.rejects(readWhitelistFile(new File(["Unique ID,Name"], name)));
  }
});

const chrome = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && fs.existsSync(p));

test(
  "Chrome reads inline and shared strings from real workbooks",
  {
    skip: chrome ? false : "Chrome unavailable",
  },
  async (t) => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "whitelist-workbook-"),
    );
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const fixtures = ["whitelist.xlsx", "whitelist-shared-strings.xlsx"].map(
      (name) =>
        fs
          .readFileSync(path.join(__dirname, "fixtures", name))
          .toString("base64"),
    );
    const source = ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/core/event/whitelist-xlsx.ts"),
        "utf8",
      ),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    ).outputText;
    const harness = path.join(directory, "test.html");
    fs.copyFileSync(require.resolve("sax"), path.join(directory, "sax.js"));
    fs.writeFileSync(
      harness,
      `<body><output></output><script src="./sax.js"></script><script type="importmap">{"imports":{"sax":"data:text/javascript,export const parser = globalThis.sax.parser"}}</script><script type="module">
    ${source}
    const files = ${JSON.stringify(fixtures)}.map(data => new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], "example.xlsx"));
    try { document.querySelector("output").textContent = JSON.stringify(await Promise.all(files.map(readWhitelistWorkbook))); }
    catch (error) { document.querySelector("output").textContent = String(error); }
    </script></body>`,
    );
    const html = execFileSync(
      chrome,
      [
        "--headless",
        "--disable-gpu",
        "--disable-background-networking",
        "--user-data-dir=" + path.join(directory, "profile"),
        "--dump-dom",
        "--virtual-time-budget=5000",
        pathToFileURL(harness).href,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 },
    );
    const [rows, sharedRows] = JSON.parse(
      html.match(/<output>([^<]*)<\/output>/)[1],
    );
    assert.deepEqual(rows, sharedRows);
    assert.deepEqual(rows[0], ["Unique ID", "Name"]);
  },
);
test("real XLSX workbooks receive the same whitelist preview as CSV", async () => {
  const [rows, sharedRows] = await Promise.all(
    ["whitelist.xlsx", "whitelist-shared-strings.xlsx"].map((name) =>
      readWhitelistFile(
        new File(
          [fs.readFileSync(path.join(__dirname, "fixtures", name))],
          name,
        ),
      ),
    ),
  );
  const csv = await readWhitelistFile(
    new File(
      [
        "Unique ID,Name\n HELLO@example.com ,ผู้เข้าร่วม\nhello@example.com,Duplicate\nused@example.com,Already registered\ninvalid,Invalid",
      ],
      "list.csv",
    ),
  );
  assert.deepEqual(rows, csv);
  assert.deepEqual(sharedRows, csv);
  const used = {
    id: "existing",
    uniqueId: "used@example.com",
    name: "",
    status: "joined",
  };
  const preview = previewWhitelistImport(rows, "list.xlsx", [used]);
  assert.equal(preview.invalidCount, 3);
  assert.deepEqual(
    preview.entries.map(({ uniqueId, name }) => [uniqueId, name]),
    [["hello@example.com", "ผู้เข้าร่วม"]],
  );
  assert.deepEqual(replaceWhitelist([used], preview.entries), [
    used,
    ...preview.entries,
  ]);
});
