import { parser } from "sax";

// Read the first worksheet of an OOXML workbook. Only inflate the XML parts we use.
const maxXmlBytes = 16 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });

const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit++)
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
});

function checksum(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function openArchive(bytes: Uint8Array<ArrayBuffer>) {
  const view = new DataView(bytes.buffer);
  let end = bytes.length - 22;
  const first = Math.max(0, end - 65535);
  while (
    end >= first &&
    !(
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
  )
    end--;
  if (end < first) throw new Error("Invalid ZIP directory");
  const entries = new Map<string, number>();
  let offset = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50)
      throw new Error("Invalid ZIP entry");
    const nameLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    entries.set(name, offset);
    offset +=
      46 +
      nameLength +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }

  return async (path: string) => {
    const header = entries.get(path);
    if (header === undefined) throw new Error("Missing workbook part");
    const size = view.getUint32(header + 24, true);
    const compressed = view.getUint32(header + 20, true);
    const local = view.getUint32(header + 42, true);
    if (size > maxXmlBytes || view.getUint32(local, true) !== 0x04034b50)
      throw new Error("Invalid workbook part");
    const start =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);
    if (start + compressed > bytes.length)
      throw new Error("Truncated workbook part");
    const packed = bytes.subarray(start, start + compressed);
    const method = view.getUint16(header + 10, true);
    let raw: Uint8Array<ArrayBuffer>;
    if (method === 0 && packed.length === size) {
      raw = packed;
    } else if (method === 8) {
      const reader = new Blob([packed])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"))
        .getReader();
      raw = new Uint8Array(size);
      let length = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw.set(value, length);
          length += value.length;
        }
      } finally {
        await reader.cancel();
      }
      if (length !== size) throw new Error("Truncated workbook XML");
    } else {
      throw new Error("Unsupported workbook compression");
    }
    if (checksum(raw) !== view.getUint32(header + 16, true))
      throw new Error("Corrupt workbook part");
    const xml = decoder.decode(raw);
    if (/<!DOCTYPE/i.test(xml)) throw new Error("Unsupported workbook XML");
    return xml;
  };
}

type Attributes = Record<string, string>;
interface XmlHandlers {
  open?(name: string, attributes: Attributes): void;
  text?(value: string, parents: readonly string[]): void;
  close?(name: string): void;
}

// Workbook parts are data. SAX decodes XML text without creating browser elements.
function readElements(xml: string, handlers: XmlHandlers) {
  const reader = parser(true, { strictEntities: true });
  const parents: string[] = [];
  reader.onopentag = (tag) => {
    const name = tag.name.split(":").pop()!;
    parents.push(name);
    handlers.open?.(name, tag.attributes);
  };
  reader.ontext = reader.oncdata = (text) => handlers.text?.(text, parents);
  reader.onclosetag = () => handlers.close?.(parents.pop()!);
  reader.onerror = (error) => {
    throw error;
  };
  reader.write(xml).close();
}

function readStrings(xml: string) {
  const strings: string[] = [];
  let value = "";
  readElements(xml, {
    open(name) {
      if (name === "si") value = "";
    },
    text(text, parents) {
      if (parents.at(-1) === "t" && !parents.includes("rPh")) value += text;
    },
    close(name) {
      if (name === "si") strings.push(value);
    },
  });
  return strings;
}

function readRows(xml: string, strings: string[]) {
  const rows: string[][] = [];
  let hasData = false;
  let insideData = false;
  let cells: string[] = [];
  let column = 0;
  let type = "";
  let value = "";
  readElements(xml, {
    open(name, attrs) {
      if (name === "sheetData") insideData = hasData = true;
      if (!insideData) return;
      if (name === "row") {
        cells = [];
        column = 0;
      }
      if (name === "f") throw new Error("Expected literal whitelist values");
      if (name !== "c") return;
      type = attrs.t;
      value = "";
      if (type === "e") throw new Error("Expected literal whitelist values");
      if (attrs.r) {
        const letters = attrs.r.match(/^([A-Z]{1,3})[1-9]\d*$/)?.[1];
        if (!letters) throw new Error("Invalid cell address");
        column =
          Array.from(letters).reduce(
            (n, c) => n * 26 + c.charCodeAt(0) - 64,
            0,
          ) - 1;
      }
    },
    text(text, parents) {
      if (!insideData) return;
      if (
        type === "inlineStr"
          ? parents.at(-1) === "t" && !parents.includes("rPh")
          : parents.at(-1) === "v"
      )
        value += text;
    },
    close(name) {
      if (!insideData) return;
      if (name === "c") {
        if (type === "s") {
          if (!/^\d+$/.test(value) || Number(value) >= strings.length)
            throw new Error("Invalid shared string");
          value = strings[Number(value)];
        }
        if (value) cells[column] = value;
        column++;
      }
      if (name === "row" && cells.some((v) => v.trim())) rows.push(cells);
      if (name === "sheetData") insideData = false;
    },
  });
  if (!hasData) throw new Error("Invalid worksheet");
  return rows;
}

export async function readWhitelistWorkbook(file: File): Promise<string[][]> {
  if (file.size > 32 * 1024 * 1024) throw new Error("Workbook too large");
  const readXml = openArchive(new Uint8Array(await file.arrayBuffer()));
  let sheetId: string | undefined;
  readElements(await readXml("xl/workbook.xml"), {
    open(name, attrs) {
      if (name === "sheet" && sheetId === undefined) {
        sheetId = Object.entries(attrs).find(
          ([key]) => key.split(":").pop() === "id",
        )?.[1];
      }
    },
  });
  if (!sheetId) throw new Error("Missing worksheet");
  let sheetPath = "";
  let stringsPath = "";
  readElements(await readXml("xl/_rels/workbook.xml.rels"), {
    open(name, attrs) {
      if (name !== "Relationship") return;
      const isSheet =
        attrs.Id === sheetId && attrs.Type?.endsWith("/worksheet");
      const isStrings = attrs.Type?.endsWith("/sharedStrings");
      if (!isSheet && !isStrings) return;
      if (!attrs.Target || attrs.TargetMode === "External")
        throw new Error("Invalid workbook relationship");
      const path = decodeURIComponent(
        new URL(attrs.Target, "https://workbook.invalid/xl/").pathname.slice(1),
      );
      if (isSheet) sheetPath = path;
      else stringsPath = path;
    },
  });
  const strings = stringsPath ? readStrings(await readXml(stringsPath)) : [];
  return readRows(await readXml(sheetPath), strings);
}
