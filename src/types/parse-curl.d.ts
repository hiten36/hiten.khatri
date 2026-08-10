declare module "parse-curl" {
  interface ParsedCurl {
    method?: string;
    url?: string;
    header?: Record<string, string>;
    body?: string;
  }

  function parseCurl(input: string): ParsedCurl | undefined;
  export default parseCurl;
}
