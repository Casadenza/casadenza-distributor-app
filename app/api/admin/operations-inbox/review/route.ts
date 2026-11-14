import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/serverSession";
import { isSameOrigin } from "@/lib/communication-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session=await getServerSession();
  if(!session || session.role!=="ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  if(!isSameOrigin(request)) return NextResponse.json({error:"Invalid origin"},{status:403});
  if(process.env.VERCEL_ENV!=="production"||process.env.AUTO_INBOX_SCAN_ENABLED!=="true")
    return NextResponse.json({error:"Review queue changes are disabled in Preview"},{status:403});
  const limiter=checkRateLimit("operations-review:"+session.userId+":"+getClientIp(request),20,60000);
  if(!limiter.ok)return NextResponse.json({error:"Too many review requests"},{status:429});
  const body=await request.json().catch(()=>null);
  if(body?.action!=="DISMISS"||typeof body?.itemId!=="string"||
     !/^[a-zA-Z0-9_-]{10,100}$/.test(body.itemId)) {
    return NextResponse.json({error:"Invalid review request"},{status:400});
  }
  const result=await prisma.operationsInboxItem.updateMany({
    where:{id:body.itemId,reviewStatus:"PENDING"},
    data:{reviewStatus:"DISMISSED",reviewedBy:session.userId,reviewedAt:new Date()},
  });
  if(result.count!==1)return NextResponse.json({error:"Queue entry already reviewed or not found"},{status:409});
  return NextResponse.json({ok:true,status:"DISMISSED",note:"Email remains unchanged and no customer received a document."});
}
