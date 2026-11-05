import { MissingTokenError } from "@/lib/transport";

export function ErrorPanel({ error }: { error: unknown }) {
  const missingToken = error instanceof MissingTokenError;

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-rose-700">
        {missingToken ? "Mangler GitHub-token" : "Klarte ikke å hente issuene fra GitHub"}
      </h1>
      {missingToken ? (
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <p>Lag en <code className="rounded bg-slate-100 px-1">.env.local</code> med tokenet ditt, og start appen på nytt:</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            echo &quot;GITHUB_TOKEN=$(gh auth token)&quot; &gt; .env.local
          </pre>
          <p>
            Eller kjør med testdata: <code className="rounded bg-slate-100 px-1">pnpm dev:mock</code>
          </p>
        </div>
      ) : (
        <p className="mt-3 font-mono text-sm text-slate-600">{error instanceof Error ? error.message : String(error)}</p>
      )}
    </div>
  );
}
