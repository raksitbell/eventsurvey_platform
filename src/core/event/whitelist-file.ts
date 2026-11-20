import { parseWhitelistCsv } from "@/core/event/whitelist";
export const WHITELIST_IMPORT_ACCEPT = ".csv";
export async function readWhitelistFile(file: File): Promise<unknown[][]> {
  if (!/\.csv$/i.test(file.name)) throw new Error("Unsupported file type");
  return parseWhitelistCsv(await file.text());
}
