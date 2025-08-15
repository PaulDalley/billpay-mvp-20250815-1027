export default function SettingsPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="space-y-3">
        <div className="rounded-xl border p-4">
          <div className="font-medium mb-1">Account</div>
          <p className="text-sm text-gray-500">Manage your email connections and profile.</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="font-medium mb-1">Billing</div>
          <p className="text-sm text-gray-500">Plan, invoices, and payment method.</p>
        </div>
      </section>
    </main>
  );
}

