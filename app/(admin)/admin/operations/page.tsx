import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import OperationsHubClient from "./operations-hub-client";
export const dynamic = "force-dynamic";
export default async function OperationsHubPage() {
  const session=await getServerSession();
  if(!session) redirect("/login");
  if(session.role!=="ADMIN") redirect("/admin");
  const orders=await prisma.order.findMany({
    select:{id:true,distributorId:true,createdAt:true,notes:true,distributor:{select:{name:true,country:true}}},
    orderBy:{createdAt:"desc"},take:1500,
  });
  const options=orders.map(o=>{
    let meta:any={};try{meta=JSON.parse(o.notes||"{}")}catch{}
    return {
      id:o.id,distributorId:o.distributorId,
      distributorName:o.distributor.name,country:o.distributor.country,
      poNumber:String(meta.poNumber||meta.po||""),
      invoiceNumber:String(meta.invoiceNumber||meta.invoiceNo||""),
      date:o.createdAt.toISOString().slice(0,10),
    };
  });
  return <OperationsHubClient orders={options}/>;
}
