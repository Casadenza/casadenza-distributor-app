import "server-only";
import pdfParse from "pdf-parse";

export type PdfTextResult={text:string;status:"EXTRACTED"|"EMPTY"|"TOO_LARGE"|"INVALID"};
const MAX_BYTES=2*1024*1024;
const MAX_TEXT=8500;

/** Extract only a bounded sample of text; never log/store raw attachment contents.
 * Scanned image-only PDFs will be EMPTY until a separate OCR service is integrated.
 */
export async function extractShipmentPdfText(buffer:Buffer):Promise<PdfTextResult> {
  if(buffer.length<5 || buffer.subarray(0,5).toString("ascii")!=="%PDF-") {
    return {text:"",status:"INVALID"};
  }
  if(buffer.length>MAX_BYTES)return {text:"",status:"TOO_LARGE"};
  try{
    const doc=await pdfParse(buffer,{max:5});
    const text=(doc.text||"").trim().slice(0,MAX_TEXT);
    return {text,status:text?"EXTRACTED":"EMPTY"};
  }catch{return {text:"",status:"INVALID"};}
}
