import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto mt-20 max-w-md text-center">
      <h1 className="text-2xl font-semibold">Fant ikke epicen</h1>
      <p className="mt-2 text-slate-600">Det finnes ingen label med det navnet i navikt/sas-issues.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Til alle epicer
      </Link>
    </main>
  );
}
