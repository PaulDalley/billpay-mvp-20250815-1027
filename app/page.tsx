"use client";
import { useEffect, useMemo, useState } from "react";
type Profile = { connected: boolean; profile?: { displayName?: string; userPrincipalName?: string; mail?: string } };
type Property = { id: string; label: string; address?: string | null };
type Summary = { property: Record<string, { property: Property; bills: any[] }>; personal: any[]; tax: any[]; unclassified: any[] };
type BillItem = { id: string; subject?: string; from: string; received: string; hasAttachments: boolean; webLink: string; amountDue?: number|null; dueDate?: string|null; category: "property"|"personal"|"tax"|"unclassified"; propertyId?: string };
export default function Home() {
  const [prof,setProf]=useState<Profile|null>(null);
  const [props,setProps]=useState<Property[]>([]);
  const [newProp,setNewProp]=useState({label:"",address:""});
  const [summary,setSummary]=useState<Summary|null>(null);
  const [daysWindow,setDaysWindow]=useState(180);
  const [loadingBills,setLoadingBills]=useState(false);
  const [activeTab,setActiveTab]=useState<{kind:"all"|"personal"|"tax"|"unclassified"|"property";propertyId?:string}>({kind:"all"});
  const [tabItems,setTabItems]=useState<BillItem[]>([]);
  const [tabLoading,setTabLoading]=useState(false);
  const loadProfile=async()=>{const r=await fetch("/api/ms/me",{cache:"no-store"});setProf(r.ok?await r.json():{connected:false});};
  const loadProps=async()=>{const r=await fetch("/api/properties",{cache:"no-store"});if(r.ok)setProps((await r.json()).items||[]);};
  const loadSummary=async()=>{const r=await fetch("/api/bills/summary",{cache:"no-store"});if(r.ok)setSummary((await r.json()).summary);};
  useEffect(()=>{loadProfile();loadProps();loadSummary();},[]);
  const connect=()=>{window.location.href="/api/ms/connect";};
  const signout=async()=>{await fetch("/api/ms/signout",{method:"POST"});setProf({connected:false});};
  const findBills=async()=>{setLoadingBills(true);try{await fetch(`/api/inbox/bills?top=50&days=${daysWindow}`,{cache:"no-store"});await loadSummary();await loadTab({kind:"all"});setActiveTab({kind:"all"});}finally{setLoadingBills(false);}};
  const loadTab=async(tab:{kind:"all"|"personal"|"tax"|"unclassified"|"property";propertyId?:string})=>{setTabLoading(true);try{const q=tab.kind==="property"?`propertyId=${encodeURIComponent(tab.propertyId!)}`:`bucket=${tab.kind}`;const r=await fetch(`/api/bills/by?${q}`,{cache:"no-store"});const j=await r.json();setTabItems(j.items||[]);}finally{setTabLoading(false);}};
  const addProperty=async(e:any)=>{e.preventDefault();const body={label:newProp.label||"Property",address:newProp.address||null};await fetch("/api/properties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});setNewProp({label:"",address:""});await loadProps();await loadSummary();};
  const label=prof?.connected?`Connected as ${prof?.profile?.displayName||""} (${prof?.profile?.mail||prof?.profile?.userPrincipalName||""})`:"Not connected";
  const propertyTabs=useMemo(()=>{if(!summary)return[];return Object.values(summary.property).map((x:any)=>({id:x.property.id,label:x.property.label,count:x.bills.length}));},[summary]);
  useEffect(()=>{if(summary)loadTab(activeTab);},[summary]); 
  return (<main className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
    <div className="w-full max-w-6xl bg-white shadow-xl rounded-2xl p-8 space-y-6">
      <h1 className="text-4xl font-bold text-blue-600 text-center">Bill Concierge MVP</h1>
      <p className="text-gray-600 text-center">Auto-detected AU property addresses become tabs. Personal & Tax are separate tabs. Only bill-like emails are shown & saved.</p>
      <div className="rounded-xl border p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h2 className="font-semibold text-lg">Microsoft</h2><p className="text-sm text-gray-600">{label}</p></div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Window (days)</label>
            <input type="number" min={7} max={365} value={daysWindow} onChange={e=>setDaysWindow(Math.max(7,Math.min(365,Number(e.target.value||180))))} className="w-24 border rounded-lg px-3 py-1.5 text-sm" />
            <button onClick={findBills} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg" disabled={loadingBills}>{loadingBills?"Finding…":"Find Bills"}</button>
            {prof?.connected && <button onClick={signout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg">Sign out</button>}
          </div>
        </div>
      </div>
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold text-lg mb-3">Properties</h2>
        <form onSubmit={addProperty} className="flex flex-col md:flex-row gap-2 mb-3">
          <input className="border rounded-lg px-3 py-2 flex-1" placeholder="Label (e.g., 12 Example St)" value={newProp.label} onChange={e=>setNewProp(p=>({...p,label:e.target.value}))}/>
          <input className="border rounded-lg px-3 py-2 flex-1" placeholder="Address (optional)" value={newProp.address} onChange={e=>setNewProp(p=>({...p,address:e.target.value}))}/>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">Add</button>
        </form>
        {props.length===0?<p className="text-sm text-gray-500">Auto-created properties will appear here as we detect addresses.</p>:(
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">{props.map(p=>(
            <li key={p.id} className="border rounded-lg p-3"><div className="font-medium">{p.label}</div>{p.address&&<div className="text-xs text-gray-500">{p.address}</div>}</li>
          ))}</ul>
        )}
      </div>
      <div className="rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={activeTab.kind==="all"} onClick={()=>{setActiveTab({kind:"all"});loadTab({kind:"all"});}}>All</TabButton>
          {propertyTabs.map(t=>(
            <TabButton key={t.id} active={activeTab.kind==="property"&&activeTab.propertyId===t.id} onClick={()=>{setActiveTab({kind:"property",propertyId:t.id});loadTab({kind:"property",propertyId:t.id});}}>{t.label} <span className="ml-1 text-[10px] text-gray-500">({t.count})</span></TabButton>
          ))}
          <TabButton active={activeTab.kind==="personal"} onClick={()=>{setActiveTab({kind:"personal"});loadTab({kind:"personal"});}}>Personal</TabButton>
          <TabButton active={activeTab.kind==="tax"} onClick={()=>{setActiveTab({kind:"tax"});loadTab({kind:"tax"});}}>Tax</TabButton>
          <TabButton active={activeTab.kind==="unclassified"} onClick={()=>{setActiveTab({kind:"unclassified"});loadTab({kind:"unclassified"});}}>Unclassified</TabButton>
        </div>
        <div className="mt-4">
          {tabLoading?<p className="text-sm text-gray-500">Loading…</p>:tabItems.length===0?<p className="text-sm text-gray-500">No items in this tab yet.</p>:(
            <ul className="divide-y">{tabItems.map(m=>(
              <li key={m.id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.subject||"(no subject)"}</div>
                  <div className="text-xs text-gray-500">{m.from} • {m.received?new Date(m.received).toLocaleString():""}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{m.category}</span>
                    {m.amountDue!=null&&<span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">${m.amountDue.toFixed(2)}</span>}
                    {m.dueDate&&<span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">due {new Date(m.dueDate).toLocaleDateString()}</span>}
                    {m.hasAttachments&&<span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">attachments</span>}
                  </div>
                </div>
                <a className="text-sm text-blue-600 hover:underline shrink-0" href={m.webLink} target="_blank" rel="noreferrer">Open</a>
              </li>
            ))}</ul>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">Use “Find Bills” (default 180 days). Properties auto-create from detected AU addresses; you can still add/rename manually.</p>
    </div>
  </main>); }
function TabButton(p:{active:boolean;onClick:()=>void;children:any}){return(<button onClick={p.onClick} className={"px-3 py-1.5 rounded-lg border text-sm "+(p.active?"bg-blue-600 text-white border-blue-600":"bg-white hover:bg-gray-50 text-gray-700 border-gray-200")}>{p.children}</button>);}
