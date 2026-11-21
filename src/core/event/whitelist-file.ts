import { parseWhitelistCsv } from "@/core/event/whitelist";

export async function readWhitelistFile(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseWhitelistCsv(await file.text());
  if (/\.xlsx$/i.test(file.name)) {
    const { readWhitelistWorkbook } = await import("./whitelist-xlsx");
    return readWhitelistWorkbook(file);
  }
  throw new Error("Unsupported file type");
}
