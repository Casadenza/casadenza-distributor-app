"use client";
import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, CircleX, Gift, RefreshCcw, Coins, ClipboardCheck } from "lucide-react";

type Partner = { id:string; name:string; country:string|null; zohoAccountId:string|null };
type Submission = {id:string;type:string;reference:string;description:string; evidenceUrl:string|null;marketingConsent:boolean; createdAt:string; wallet:{distributor:{name:string; country:string|null}}};
type Redemption = {id:string; type:string; points:number; orderId:string|null; notes:string; createdAt:string;wallet:{distributor:{name:string;country:string|null}}};
type RewardSale={id:string;invoiceId:string;currency:string;netAmountCents:number;pointsAwarded:number;invoiceDate:string;wallet:{distributor:{name:string}}};
type Payload={ enabled:boolean; policy:{salesThreshold:{USD:number;EUR:number};activity:Record<string,{label:string;points:number;maxPerYear:number}>}; distributors:Partner[];pendingSubmissions:Submission[];pendingRedemptions:Redemption[];recentSales:RewardSale[]};
const inp="min-h-[44px] w-full rounded-xl border border-[#DBD2C4] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#A68C60]";
const button="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#27221E] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45";
const fmt=(n:number)=>n.toLocaleString("en-US");
export default function AdminPartnerRewards() {
  const [data,setData]=useState<Payload|null>(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState("");
  const [dist,setDist]=useState("");
  const [invoiceId,setInvoiceId]=useState("");
  const [invoiceDate,setInvoiceDate]=useState("");
  const [currency,setCurrency]=useState<"USD"|"EUR">("USD");
  const [netAmount,setNetAmount]=useState("");
  const [paidVerified,setPaidVerified]=useState(false);
  const [zohoVerified,setZohoVerified]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const res=await fetch("/api/admin/rewards",{cache:"no-store"});
      const j=await res.json();if(!res.ok)throw Error(j.error||"Unable to load Partner Rewards");
      setData(j);setError("");
    }catch(e:any){setError(e?.message||"Unable to load Partner Rewards")}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load()},[load]);

  async function act(action:string,extra:Record<string,unknown>){
    if(!data?.enabled||busy)return;
    setBusy(action);setError("");setNotice("");
    try{
      const res=await fetch("/api/admin/rewards",{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...extra}),
      });
      const j=await res.json();if(!res.ok)throw Error(j.error||"Action unsuccessful");
      setNotice(action==="CREDIT_PAID_INVOICE"
        ? "Verified sales credited: "+j.currency+" "+fmt(j.newAnnualSales)+" YTD. "+fmt(j.awarded)+" point(s) earned."
        : "Admin action saved successfully.");
      await load();
    }catch(e:any){setError(e?.message||"Action unsuccessful")}
    finally{setBusy("")}
  }
  return <div className="mx-auto max-w-[1250px] space-y-5 p-3 sm:p-6">
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AD8F58]">Executive Control / Partner Rewards</p>
      <h1 className="mt-1 font-serif text-[30px] text-[#27231F]">Distributor Rewards Management</h1>
      <p className="mt-2 max-w-[900px] text-[13px] leading-6 text-[#776E62]">Review genuine partner contributions, validate paid USD/EUR sales beyond the annual 50,000 threshold, approve reward requests, and keep a traceable lifetime points ledger.</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAE1D4] bg-white p-4">
      <p className="text-[12px] text-[#766A5B]">{data?.enabled?"Programme activated":"Preview — read only. No points are credited and no invoices or samples are changed."}</p>
      <button className={button} disabled={loading} onClick={()=>void load()}><RefreshCcw size={14}/>{loading?"Loading…":"Refresh"}</button>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#EAE1D4] bg-white p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><Coins size={18} className="text-[#AA8B52]"/>Verified Sales & Annual Points</h2>
        <p className="mt-2 text-[12px] leading-5 text-[#85796A]">Points only on verified paid merchandise sales over US$50,000 or €50,000 per calendar year. Track currencies separately, and verify the invoice/credit notes in Zoho before entry.</p>
        <form className="mt-4 space-y-3" onSubmit={e=>{
          e.preventDefault();
          if(!window.confirm("Are you certain the invoice is paid, its net value is correct, and no prior rewards were given?"))return;
          void act("CREDIT_PAID_INVOICE",{distributorId:dist,invoiceId,invoiceDate,currency,
            netAmount:Number(netAmount),verifiedPaid:paidVerified,zohoInvoiceVerified:zohoVerified});
        }}>
          <label className="block text-[12px] font-medium text-[#766A5B]">Distributor
            <select className={inp+" mt-1"} value={dist} onChange={e=>{setDist(e.target.value);setPaidVerified(false);setZohoVerified(false)}}>
              <option value="">Select existing distributor</option>
              {(data?.distributors||[]).map(d=><option value={d.id} key={d.id}>{d.name}{d.country?" · "+d.country:""}{!d.zohoAccountId?" (Zoho not linked)":""}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-medium text-[#766A5B]">Exact invoice ID/number
              <input className={inp+" mt-1"} required value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} maxLength={120}/>
            </label>
            <label className="text-[12px] font-medium text-[#766A5B]">Invoice date
              <input className={inp+" mt-1"} type="date" required value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}/>
            </label>
            <label className="text-[12px] font-medium text-[#766A5B]">Invoice currency
              <select className={inp+" mt-1"} value={currency} onChange={e=>setCurrency(e.target.value as "USD"|"EUR")}>
                <option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </label>
            <label className="text-[12px] font-medium text-[#766A5B]">Net paid merchandise value
              <input className={inp+" mt-1"} type="number" min={0.01} step="0.01" required value={netAmount} onChange={e=>setNetAmount(e.target.value)} placeholder="Exclude freight/tax"/>
            </label>
          </div>
          <label className="flex gap-2 text-[12px] text-[#796D5B]"><input className="mt-1" type="checkbox" checked={paidVerified} onChange={e=>setPaidVerified(e.target.checked)}/>I verified that this invoice is paid and not refunded.</label>
          <label className="flex gap-2 text-[12px] text-[#796D5B]"><input className="mt-1" type="checkbox" checked={zohoVerified} onChange={e=>setZohoVerified(e.target.checked)}/>I checked the exact Zoho invoice, any credit notes, net merchandise value and distributor ownership.</label>
          <button className={button} type="submit" disabled={!data?.enabled||!!busy||!dist||!invoiceId||!invoiceDate||!netAmount||!paidVerified||!zohoVerified}>Verify and credit points</button>
        </form>
      </section>
      <section className="rounded-2xl border border-[#EAE1D4] bg-white p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><Award size={18} className="text-[#AA8B52]"/>Activity submissions</h2>
        {!data?.pendingSubmissions?.length&&<p className="mt-3 text-[12px] text-[#928675]">No pending submissions.</p>}
        <div className="mt-3 max-h-[550px] space-y-3 overflow-y-auto">
          {(data?.pendingSubmissions||[]).map(s=><div key={s.id} className="rounded-xl border border-[#EBE4D8] bg-[#FDFBF8] p-3">
            <p className="text-[13px] font-semibold">{s.wallet.distributor.name}</p>
            <p className="text-[12px] text-[#756958]">{data?.policy.activity[s.type]?.label||s.type} · {s.reference}</p>
            <p className="mt-2 whitespace-pre-wrap text-[12px]">{s.description}</p>
            {s.evidenceUrl&&<a className="mt-2 block break-all text-[12px] font-semibold text-[#967447] underline" href={s.evidenceUrl} target="_blank" rel="noopener noreferrer">Review submitted evidence</a>}
            <p className="mt-2 text-[11px] text-[#8C7F6E]">Marketing consent: {s.marketingConsent?"Yes":"No"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={button} disabled={!data?.enabled||!!busy} onClick={()=>{if(window.confirm("Verify this contribution and award points?"))void act("APPROVE_ACTIVITY",{id:s.id,reviewNote:"Evidence verified by admin"})}}><CheckCircle2 size={14}/>Approve +{data?.policy.activity[s.type]?.points||0}</button>
              <button className="rounded-xl border border-[#E5D8C9] px-3 text-[12px] disabled:opacity-45" disabled={!data?.enabled||!!busy} onClick={()=>{if(window.confirm("Reject this submission without points?"))void act("REJECT_ACTIVITY",{id:s.id,reviewNote:"Insufficient verified evidence"})}}><CircleX size={14} className="mr-1 inline"/>Reject</button>
            </div>
          </div>)}
        </div>
      </section>
    </div>
    <section className="rounded-2xl border border-[#EAE1D4] bg-white p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold"><Gift size={18} className="text-[#AA8B52]"/>Redemptions awaiting fulfilment</h2>
      <p className="mt-2 text-[12px] text-[#7D7162]">Discounts must be confirmed in the actual order quotation. Sample material points never cover freight, duties or import charges; those are payable by the distributor.</p>
      {!data?.pendingRedemptions?.length&&<p className="mt-3 text-[12px] text-[#8B8177]">No pending redemptions.</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(data?.pendingRedemptions||[]).map(r=><div key={r.id} className="rounded-xl border border-[#EBE4D8] bg-[#FDFBF8] p-4">
          <p className="text-[13px] font-semibold">{r.wallet.distributor.name} · {r.points.toLocaleString("en-US")} points</p>
          <p className="mt-1 text-[12px]">{r.type==="SAMPLES"?"Sample material (shipping paid by distributor)":"Order merchandise discount"}</p>
          {r.orderId&&<p className="mt-1 break-all text-[11px] text-[#7F725F]">Order ID: {r.orderId}</p>}
          <p className="mt-2 text-[12px] text-[#807465]">{r.notes}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={button} disabled={!data?.enabled||!!busy} onClick={()=>{if(window.confirm("Confirm this redemption was already fulfilled in the actual order process?"))void act("FULFILL_REDEMPTION",{id:r.id,fulfilledExternally:true,reviewNote:"Fulfilment verified by admin"})}}>Mark fulfilled</button>
            <button className="rounded-xl border border-[#E5D8C9] px-3 text-[12px] disabled:opacity-45" disabled={!data?.enabled||!!busy} onClick={()=>{if(window.confirm("Reject redemption and return reserved points?"))void act("REJECT_REDEMPTION",{id:r.id,reviewNote:"Not approved; points refunded"})}}>Reject & refund</button>
          </div>
        </div>)}
      </div>
    </section>
    {(data?.recentSales?.length||0)>0&&<section className="rounded-2xl border border-[#EAE1D4] bg-white p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold"><ClipboardCheck size={18}/>Verified sale history</h2>
      {(data?.recentSales||[]).map(s=><p className="border-b border-[#EEE6D9] py-3 text-[12px]" key={s.id}>
        <strong>{s.wallet.distributor.name}</strong> · {s.invoiceId} · {s.currency} {(s.netAmountCents/100).toLocaleString("en-US")} · +{s.pointsAwarded} points
      </p>)}
    </section>}
    {notice&&<p role="status" className="rounded-xl border border-[#DFD1B9] bg-[#F9F5EC] p-3 text-[12px]">{notice}</p>}
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">{error}</p>}
    <p className="text-[11px] text-[#847A6E]">Partner Rewards is under review. No database migration has been applied. Activating this feature requires reviewed commercial policy, an isolated DB test, paid-invoice verification and explicit production release.</p>
  </div>;
}
