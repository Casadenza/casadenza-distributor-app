import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {getServerSession} from "@/lib/serverSession";
import {isCarrier,parseShipment} from "@/lib/order-shipment";
import {parseOrderNotes} from "@/lib/order-document-folders";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{orderId:string}>}){
 const session=await getServerSession();
 if(!session || !["ADMIN","ORDER_ADMIN"].includes(String(session.role)))
   return NextResponse.json({error:"Forbidden"},{status:403});
 if(request.headers.get("origin")!==new URL(request.url).origin)
   return NextResponse.json({error:"Invalid origin"},{status:403});
 const {orderId:id}=await params;
 if(!/^[a-zA-Z0-9_-]{10,80}$/.test(id))
   return NextResponse.json({error:"Invalid order ID"},{status:400});
 const input=await request.json().catch(()=>null);
 const values=input?.shipment;
 if(!values||typeof values!=="object"||Array.isArray(values)||!isCarrier(values.carrier))
   return NextResponse.json({error:"Invalid shipment data"},{status:400});
 const dates=["etd","eta"];
 for(const key of dates){
   if(typeof values[key]!=="string"|| (values[key]!=="" && !/^\d{4}-\d{2}-\d{2}$/.test(values[key])))
     return NextResponse.json({error:"Dates must be YYYY-MM-DD"},{status:400});
 }
 const fields=["agent","trackingNumber","hawb","mawb","shippingBill","containerNumber","vessel","etdLocation","etaLocation","status"] as const;
 for(const field of fields){
   if(typeof values[field]!=="string"||values[field].length>100)
     return NextResponse.json({error:"Invalid "+field},{status:400});
 }
 if(values.trackingNumber&&!/^[A-Za-z0-9\s-]{6,40}$/.test(values.trackingNumber))
   return NextResponse.json({error:"Invalid tracking number"},{status:400});
 // Admin-approved shipment data is retained on its original order.
 // This does not share email attachments or publish a document.
 const order=await prisma.order.findUnique({where:{id},select:{id:true,notes:true}});
 if(!order)return NextResponse.json({error:"Order not found"},{status:404});
 const previous=parseShipment(order.notes);
 const notes=parseOrderNotes(order.notes);
 const shipment={...previous,...Object.fromEntries([...fields,...dates].map(k=>[k,String(values[k]).trim()])),
  carrier:values.carrier,source:"MANUAL_ADMIN",updatedAt:new Date().toISOString()};
 await prisma.order.update({where:{id},data:{notes:JSON.stringify({...notes,shipment})}});
 return NextResponse.json({ok:true,orderId:id,shipment}, {headers:{"Cache-Control":"private, no-store"}});
}
