declare module "pdf-parse/lib/pdf-parse.js" {
  export interface PdfParseResult { numpages:number; text:string; info?:unknown }
  export default function pdfParse(input:Buffer,options?:{max?:number}):Promise<PdfParseResult>;
}
