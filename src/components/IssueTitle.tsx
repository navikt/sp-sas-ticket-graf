export function IssueTitle({ title }: { title: string }) {
  return title.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code key={index} className="rounded bg-slate-100 px-1 font-mono text-[0.9em] text-slate-800">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
