"use client";
import { useCallback, useEffect, useState } from "react";
import { Award, Camera, CheckCircle2, ChevronRight, Coins, GraduationCap, Gift, ImageIcon, Presentation, ShieldCheck, Sparkles, Truck } from "lucide-react";

type Activity = Record<string, { label: string; points: number; maxPerYear: number }>;
type Policy = {
  salesThreshold: { USD: number; EUR: number };
  pointsPer100CurrencyAboveThreshold: number;
  usdCentsPerPoint: number;
  maxOrderDiscountPercent: number;
  maxRedemptionPoints: number;
  activity: Activity;
  milestones: { amount: number; bonus: number }[];
  sampleShippingPaidByDistributor: boolean;
  pointsExpire: boolean;
};
type Submission = {id:string;type:string;reference:string;status:string;awardedPoints:number;createdAt:string};
type Redemption = {id:string;type:string;points:number;status:string;createdAt:string};
type Ledger = {id:string;kind:string;points:number;description:string;createdAt:string};
type Response = {
  enabled:boolean; policy:Policy;
  wallet:{balance:number;lifetimeEarned:number;lifetimeRedeemed:number};
  annualSales:{USD:number;EUR:number};
  submissions:Submission[];redemptions:Redemption[];ledger:Ledger[];
};
const fields = "min-h-[44px] w-full rounded-xl border border-[#DED8CD] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#B99A62]";
const button = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#24211D] px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45";
const fmt = (v: number) => Math.max(0, v || 0).toLocaleString("en-US");
export default function PartnerRewardsClient() {
  const [data, setData] = useState<Response | null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const [activity,setActivity] = useState("PROJECT_PHOTOS");
  const [reference,setReference] = useState("");
  const [description,setDescription] = useState("");
  const [evidenceUrl,setEvidenceUrl] = useState("");
  const [marketingConsent,setMarketingConsent] = useState(false);
  const [rewardType,setRewardType] = useState<"SAMPLES"|"DISCOUNT">("SAMPLES");
  const [points,setPoints] = useState(100);
  const [orderId,setOrderId] = useState("");
  const [rewardNote,setRewardNote] = useState("");
  const [shippingAccepted,setShippingAccepted] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards", {cache:"no-store"});
      const j = await res.json();
      if (!res.ok) throw Error(j.error || "Unable to load partner rewards");
      setData(j);setError("");
    } catch (e:any) {setError(e.message || "Unable to load rewards");}
  }, []);
  useEffect(() => {void load();},[load]);

  async function submit(body:object) {
    if (busy || !data?.enabled) return;
    setBusy(true);setError("");setNotice("");
    try {
      const res = await fetch("/api/rewards", {
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw Error(j.error || "Unable to submit");
      setNotice(j.message || j.note || "Request received for review.");
      await load();
    } catch (e:any) {setError(e.message || "Unable to submit");}
    finally {setBusy(false);}
  }
  const policy = data?.policy;
  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header className="rounded-[26px] border border-[#E8DFC9] bg-[#1F1C19] p-5 text-white sm:p-8">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D0AE70]">
        <Sparkles size={16}/> Casadenza Partner Rewards
      </div>
      <h1 className="font-serif text-[30px] leading-tight sm:text-[42px]">Your partnership, rewarded.</h1>
      <p className="mt-2 max-w-[670px] text-[13px] leading-6 text-[#D0CBC3]">
        Earn non-expiring points for verified sales above the annual threshold, real project installations,
        useful testimonials, webinars and Casadenza training seminars. Redeem towards approved discounts or sample materials.
      </p>
      {!data?.enabled && <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#685C49] bg-[#3A3226] px-3 py-2 text-[12px] text-[#EAD5AC]">
        <ShieldCheck size={16}/> Programme preview: submissions and redemption are not yet active.
      </p>}
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { label:"Available points",value:fmt(data?.wallet.balance||0),sub:"Never expire"},
        { label:"Lifetime points earned",value:fmt(data?.wallet.lifetimeEarned||0),sub:"Verified rewards"},
        { label:"Lifetime redeemed",value:fmt(data?.wallet.lifetimeRedeemed||0),sub:"Discounts & samples"},
      ].map(m=><div key={m.label} className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#938471]">{m.label}</p>
        <p className="mt-2 font-serif text-[32px] text-[#28241E]">{m.value}</p>
        <p className="mt-1 text-[11px] text-[#9B8A73]">{m.sub}</p>
      </div>)}
    </div>

    <div className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
      <div className="flex items-center gap-2"><Coins size={19} className="text-[#B49158]"/><h2 className="text-[18px] font-semibold">Annual sales qualification</h2></div>
      <p className="mt-2 text-[12px] leading-6 text-[#7A7063]">Sales points start only on verified net paid sales <strong>above US$50,000 or €50,000 in a calendar year</strong>. USD and EUR totals are evaluated separately; an unverified PO does not qualify. Your lifetime points do not reset annually.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["USD","EUR"] as const).map(currency=>{
          const val=data?.annualSales[currency]||0;
          const threshold=policy?.salesThreshold[currency]||50000;
          return <div key={currency} className="rounded-xl bg-[#F8F6F2] p-4">
            <div className="flex items-center justify-between text-[12px]"><strong>{currency==="USD"?"US dollars":"Euros"}</strong><span>{currency==="USD"?"$":"€"}{fmt(val)} / {currency==="USD"?"$":"€"}{fmt(threshold)}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5DED2]"><div className="h-full rounded-full bg-[#B5935A]" style={{width:Math.min(100,100*val/threshold)+"%"}}/></div>
            <p className="mt-2 text-[11px] text-[#817466]">{val>threshold?"Sales earning active":"Below sales earning threshold"}</p>
          </div>;
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#897C69]">Proposed: {policy?.pointsPer100CurrencyAboveThreshold||10} points for each 100 qualifying USD/EUR above the threshold. Sales milestones begin at 75,000, not 10,000.</p>
    </div>

    <div className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><Award size={19} className="text-[#B49158]"/><h2 className="text-[18px] font-semibold">Earn points through partner contributions</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(policy?.activity||{}).map(([key,item])=><div key={key} className="rounded-xl border border-[#ECE5DA] bg-[#FDFBF8] p-4">
          <p className="text-[13px] font-semibold text-[#302921]">{item.label}</p>
          <p className="mt-2 font-serif text-[23px] text-[#B18A51]">+{fmt(item.points)} <span className="font-sans text-[11px]">points</span></p>
          <p className="mt-1 text-[11px] text-[#948675]">Up to {item.maxPerYear} approved submissions/year</p>
        </div>)}
      </div>
      <form className="mt-5 grid gap-3 border-t border-[#EDE7DE] pt-5" onSubmit={e=>{
        e.preventDefault();
        void submit({action:"SUBMIT_ACTIVITY",type:activity,reference,description,evidenceUrl,marketingConsent});
      }}>
        <h3 className="text-[14px] font-semibold">Submit an activity for review</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-medium text-[#776A5C]">Contribution type
            <select className={fields+" mt-1"} value={activity} onChange={e=>setActivity(e.target.value)}>
              {Object.entries(policy?.activity||{}).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-[12px] font-medium text-[#776A5C]">Unique project / event / session reference
            <input required className={fields+" mt-1"} value={reference} onChange={e=>setReference(e.target.value)}
              placeholder="Project name, webinar ID or seminar date" maxLength={120}/>
          </label>
        </div>
        <label className="text-[12px] font-medium text-[#776A5C]">Tell us what you contributed
          <textarea required minLength={15} maxLength={1500} className={fields+" mt-1 min-h-[100px]"} value={description}
            onChange={e=>setDescription(e.target.value)} placeholder="Project location, application, presenter, training topic or customer quote"/>
        </label>
        <label className="text-[12px] font-medium text-[#776A5C]">Evidence link (project photos, case-study file, event registration — HTTPS)
          <input className={fields+" mt-1"} type="url" value={evidenceUrl} maxLength={900}
            onChange={e=>setEvidenceUrl(e.target.value)} placeholder="https://..."/>
        </label>
        <label className="flex items-start gap-2 text-[12px] leading-5 text-[#70675B]">
          <input type="checkbox" className="mt-1" checked={marketingConsent} onChange={e=>setMarketingConsent(e.target.checked)}/>
          I authorize Casadenza to use the provided testimonial or images in marketing where I have the necessary rights.
        </label>
        <div><button type="submit" className={button} disabled={busy||!data?.enabled}>Submit for verification <ChevronRight size={15}/></button></div>
      </form>
    </div>

    <div className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
      <div className="flex items-center gap-2"><Gift size={19} className="text-[#B49158]"/><h2 className="text-[18px] font-semibold">Redeem your points</h2></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#FAF7F0] p-4">
          <h3 className="text-[14px] font-semibold">Order discount</h3>
          <p className="mt-2 text-[12px] leading-5 text-[#796E60]">Request a discount of up to {policy?.maxOrderDiscountPercent||5}% of eligible merchandise value. Shipping, duties and tax excluded. Order-specific approval required.</p>
        </div>
        <div className="rounded-xl bg-[#FAF7F0] p-4">
          <h3 className="text-[14px] font-semibold">Samples</h3>
          <p className="mt-2 text-[12px] leading-5 text-[#796E60]">Use points towards approved sample material. <strong>Distributor pays all sample shipping and related import charges.</strong></p>
        </div>
      </div>
      <form className="mt-5 grid gap-3 border-t border-[#EDE7DE] pt-5" onSubmit={e=>{
        e.preventDefault();
        void submit({action:"REDEEM",type:rewardType,points,notes:rewardNote,orderId,sampleShippingAccepted:shippingAccepted,requestId:crypto.randomUUID()});
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-medium text-[#776A5C]">Redemption
            <select className={fields+" mt-1"} value={rewardType} onChange={e=>setRewardType(e.target.value as any)}>
              <option value="SAMPLES">Sample materials</option>
              <option value="DISCOUNT">Order discount</option>
            </select>
          </label>
          <label className="text-[12px] font-medium text-[#776A5C]">Points to use
            <input className={fields+" mt-1"} type="number" min={100} max={policy?.maxRedemptionPoints||10000} step={1} value={points}
              onChange={e=>setPoints(Number(e.target.value))}/>
          </label>
        </div>
        {rewardType==="DISCOUNT" && <label className="text-[12px] font-medium text-[#776A5C]">Existing portal order ID
          <input className={fields+" mt-1"} value={orderId} onChange={e=>setOrderId(e.target.value)}
            placeholder="Order identifier"/>
        </label>}
        <label className="text-[12px] font-medium text-[#776A5C]">Request details
          <textarea className={fields+" mt-1 min-h-[90px]"} minLength={12} value={rewardNote}
            onChange={e=>setRewardNote(e.target.value)} placeholder="Samples required, delivery country, or discount purpose"/>
        </label>
        {rewardType==="SAMPLES" && <label className="flex gap-2 text-[12px] leading-5 text-[#71675B]">
          <input className="mt-1" type="checkbox" checked={shippingAccepted} onChange={e=>setShippingAccepted(e.target.checked)}/>
          I agree that shipping, customs duties and import charges for samples are payable by me, not by reward points.
        </label>}
        <div><button type="submit" className={button} disabled={busy||!data?.enabled}>Request redemption <ChevronRight size={15}/></button></div>
      </form>
    </div>

    {(data?.submissions?.length||0)>0 && <div className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
      <h2 className="mb-3 text-[16px] font-semibold">Activity submissions</h2>
      {data!.submissions.map(s=><p key={s.id} className="border-t border-[#F0E9DF] py-3 text-[12px]">
        <strong>{policy?.activity[s.type]?.label||s.type}</strong> — {s.reference}
        <span className="ml-2 text-[#937E5B]">{s.status}{s.awardedPoints? " · +"+s.awardedPoints+" points":""}</span>
      </p>)}
    </div>}
    {(data?.redemptions?.length||0)>0 && <div className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
      <h2 className="mb-3 text-[16px] font-semibold">Reward requests</h2>
      {data!.redemptions.map(r=><p key={r.id} className="border-t border-[#F0E9DF] py-3 text-[12px]">
        <strong>{r.type}</strong> — {r.points} points <span className="ml-2 text-[#937E5B]">{r.status}</span>
      </p>)}
    </div>}
    {notice && <p role="status" className="rounded-xl border border-[#E5D8BD] bg-[#FFF8E8] p-4 text-[12px]">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-800">{error}</p>}
    <p className="text-[11px] text-[#8A8176]">The programme is a proposed commercial policy. Points are non-transferable, cannot be exchanged for cash and are subject to verification, fraud checks and Casadenza approval. Shipping is always payable for sample redemptions.</p>
  </div>;
}
