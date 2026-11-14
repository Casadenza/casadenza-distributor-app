import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {getServerSession} from "@/lib/serverSession";
import {searchOrangestarReports} from "@/lib/shipment-mail";
import {parseForwarderReport,parseShipment} from "@/lib/order-shipment";
import {parseOrderNotes} from "@/lib/order-document-folders";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:Request,{params}:{params:Promise<{orderId:string}>}){
 const session=await getServerSession();
 if(!session||!["ADMIN","ORDER_ADMIN"].includes(String(session.role)))
  return NextResponse.json({error:"Forbidden"},{status:403});
 const {orderId:id}=await params;
 if(!/^[A-Za-z0-9_-]{10,80}$/.test(id))return NextResponse.json({error:"Invalid order"},{status:400});
 const order=await prisma.order.findUnique({where:{id},select:{id:true,notes:true}});
 if(!order)return NextResponse.json({error:"Order not found"},{status:404});
 const meta=parseOrderNotes(order.notes);
 const shipment=parseShipment(order.notes);
 const refs=[meta.poNumber,meta.invoiceNumber,meta.invoiceNo,meta.buyerPoRef,
   meta.bookingNumber,meta.shipmentReference,shipment.shippingBill,shipment.hawb,shipment.mawb]
   .filter((x):x is string=>typeof x==="string"&&x.trim().length>=4);
 if(!refs.length)return NextResponse.json({ok:true,proposals:[],
   note:"This order needs an exact PO, invoice, booking or shipping reference before automatic forwarder search."});
 try{
   const reports=await searchOrangestarReports("info",refs);
   const proposals=reports.map(m=>{
     const proposed=parseForwarderReport(m.from,m.subject,m.body);
     return proposed ? {messageId:m.messageId,date:m.date,subject:m.subject,
       documentFilenames:m.filenames,sourceSender:m.from,proposed} : null;
   }).filter(x=>x!==null);
   return NextResponse.json({ok:true,orderId:id,proposals,checkedReferences:refs.length,
     published:false,note:"Forwarder email suggestions only; verify destination and order before saving."},
     {headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Gmail forwarder search unavailable"},{status:503});}
}
