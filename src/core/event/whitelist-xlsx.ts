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
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.getElementsByTagName("parsererror").length)
      throw new Error("Invalid workbook XML");
    return document;
  };
}

const elements = (root: XMLDocument | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS("*", name));

function stringValue(node: Element) {
  return elements(node, "t")
    .filter((text) => text.parentElement?.localName !== "rPh")
    .map((text) => text.textContent)
    .join("");
}

export async function readWhitelistWorkbook(file: File): Promise<string[][]> {
  if (file.size > 32 * 1024 * 1024) throw new Error("Workbook too large");
  const readXml = openArchive(new Uint8Array(await file.arrayBuffer()));
  const workbook = await readXml("xl/workbook.xml");
  const sheet = elements(workbook, "sheet")[0];
  const relationId =
    sheet &&
    Array.from(sheet.attributes).find((attr) => attr.localName === "id")?.value;
  const relations = elements(
    await readXml("xl/_rels/workbook.xml.rels"),
    "Relationship",
  );
  const pathOf = (relation?: Element) => {
    const target = relation?.getAttribute("Target");
    if (!target || relation?.getAttribute("TargetMode") === "External")
      throw new Error("Invalid workbook relationship");
    return decodeURIComponent(
      new URL(target, "https://workbook.invalid/xl/").pathname.slice(1),
    );
  };
  const relation = relations.find(
    (item) =>
      item.getAttribute("Id") === relationId &&
      item.getAttribute("Type")?.endsWith("/worksheet"),
  );
  const document = await readXml(pathOf(relation));
  const sharedRelation = relations.find((item) =>
    item.getAttribute("Type")?.endsWith("/sharedStrings"),
  );
  const strings = sharedRelation
    ? elements(await readXml(pathOf(sharedRelation)), "si").map(stringValue)
    : [];
  const data = elements(document, "sheetData")[0];
  if (!data) throw new Error("Invalid worksheet");
  const result: string[][] = [];
  for (const row of elements(data, "row")) {
    const cells: string[] = [];
    for (const cell of elements(row, "c")) {
      const address = cell.getAttribute("r");
      const letters = address?.match(/^([A-Z]{1,3})[1-9]\d*$/)?.[1];
      if (address && !letters) throw new Error("Invalid cell address");
      const column = letters
        ? Array.from(letters).reduce(
            (index, ch) => index * 26 + ch.charCodeAt(0) - 64,
            0,
          ) - 1
        : cells.length;
      const type = cell.getAttribute("t");
      const value = elements(cell, "v")[0]?.textContent ?? "";
      if (type === "e" || elements(cell, "f").length)
        throw new Error("Expected literal whitelist values");
      let text = value;
      if (type === "inlineStr") text = stringValue(cell);
      if (type === "s") {
        if (!/^\d+$/.test(value) || Number(value) >= strings.length)
          throw new Error("Invalid shared string");
        text = strings[Number(value)];
      }
      if (text) cells[column] = text;
    }
    if (cells.some((v) => v.trim())) result.push(cells);
  }
  return result;
}
