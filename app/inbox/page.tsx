"use client";import { useState } from "react";

type Bill = {
  id: string;
  issuer: string;
  amountCents: number | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  propertyId: string | null;
};

export default function InboxPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [diag, setDiag] = useState<any>(null);
  const [items, setItems] = useState<Bill[]>([]);

  const findBills = async () => {
    setLoading(true);
    setMsg(null);
    setDiag(null);
    try {
      const res = await fetch("/api/inbox/bills?days=365&top=150", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items || []);
      setDiag(json.diag || json.detail || json.note || null);

      if (json.note === "ms_not_connected") {
        setMsg("Not connected. Click ‘Connect Microsoft’ first.");
      } else if (json.note === "token_refresh_failed") {
        setMsg("Token refresh failed. Reconnect Microsoft and try again.");
      } else if (json.error === "graph_list_failed") {
        setMsg("Microsoft Graph list failed. See diagnostics below.");
      } else if ((json.items || []).length === 0) {
        setMsg("No bills detected yet. Check keywords, or try larger date range.");
      } else {
        setMsg(`Loaded ${json.items.length} bills.`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  const connect = () => {
    window.location.href = "/api/ms"; // kicks off OAuth
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Bills</h1>

      <div className="flex gap-3 mb-6">
        <button onClick={connect} className="px-4 py-2 border rounded-lg shadow-sm">Connect Microsoft</button>
        <button onClick={findBills} className="px-4 py-2 border rounded-lg shadow-sm" disabled={loading}>
          {loading ? "Finding…" : "Find bills"}
        </button>
      </div>

      {msg && <div className="mb-4 text-sm">{msg}</div>}

      {diag && (
        <details className="mb-6">
          <summary className="cursor-pointer mb-2">Diagnostics</summary>
          <pre className="p-3 border rounded bg-gray-50 overflow-auto text-xs">{JSON.stringify(diag, null, 2)}</pre>
        </details>
      )}

      <ul className="space-y-3">
        {items.map((b) => (
          <li key={b.id} className="p-3 border rounded">
            <div className="font-medium">{b.issuer || "Unknown issuer"}</div>
            <div className="text-sm">
              {typeof b.amountCents === "number" ? `$${(b.amountCents / 100).toFixed(2)}` : "—"} ·{" "}
              {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : "No due date"} · {b.status}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
