declare module "sax" {
  interface XmlParser {
    onopentag(tag: { name: string; attributes: Record<string, string> }): void;
    ontext(text: string): void;
    oncdata(text: string): void;
    onclosetag(name: string): void;
    onerror(error: Error): void;
    write(xml: string): XmlParser;
    close(): void;
  }

  export function parser(
    strict: true,
    options: { strictEntities: true },
  ): XmlParser;
}
