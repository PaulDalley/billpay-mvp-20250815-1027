export default function ConnectPage() {
  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Connect your email</h1>
      <p className="mb-6 text-sm text-gray-600">
        Connect your Microsoft account so we can find bill emails.
      </p>
      <a href="/api/ms" className="inline-block px-4 py-2 rounded-xl shadow border">
        Connect Microsoft
      </a>
    </main>
  );
}
