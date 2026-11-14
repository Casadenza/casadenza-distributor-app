declare module "pdf-parse" {
  export interface PdfParseResult { numpages:number; text:string; info?:unknown }
  export default function pdfParse(input:Buffer,options?:{max?:number}):Promise<PdfParseResult>;
}
