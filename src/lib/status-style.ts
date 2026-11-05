import type { Status } from "./tickets";

interface StatusStyle {
  label: string;
  description: string;
  card: string;
  accent: string;
  badge: string;
  dot: string;
  color: string;
}

export const statusStyle: Record<Status, StatusStyle> = {
  ferdig: {
    label: "Ferdig",
    description: "Issuet er lukket",
    card: "border-emerald-200 bg-white",
    accent: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    color: "#10b981",
  },
  pågår: {
    label: "Pågår",
    description: "Åpent og tildelt",
    card: "border-sky-300 bg-white shadow-sky-100",
    accent: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    color: "#0ea5e9",
  },
  klar: {
    label: "Klar",
    description: "Åpent, ingen åpne blokkeringer",
    card: "border-amber-300 bg-white",
    accent: "bg-amber-400",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25",
    dot: "bg-amber-400",
    color: "#fbbf24",
  },
  blokkert: {
    label: "Blokkert",
    description: "Venter på åpne blokkeringer",
    card: "border-dashed border-slate-300 bg-slate-50",
    accent: "bg-slate-300",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
    color: "#94a3b8",
  },
};
