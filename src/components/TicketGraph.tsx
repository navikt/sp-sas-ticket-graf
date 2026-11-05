"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import Link from "next/link";
import type { FaseNode, FlowNode, TicketNode } from "@/lib/flow";
import { statusStyle } from "@/lib/status-style";
import { Avatar } from "./Avatar";
import { IssueTitle } from "./IssueTitle";
import { StatusBadge } from "./StatusBadge";

const MAX_REPOS = 2;

function TicketCard({ data }: NodeProps<TicketNode>) {
  const { ticket, closedLabel, closesPhase } = data;
  const style = statusStyle[ticket.status];
  const extraRepos = ticket.repos.length - MAX_REPOS;

  return (
    <div
      data-testid="ticket"
      data-number={ticket.number}
      data-status={ticket.status}
      data-external={ticket.external}
      data-closes-phase={closesPhase ?? undefined}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-xl border pl-4 pr-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.card} ${ticket.external ? "border-dashed opacity-90" : ""} ${closesPhase ? "ring-2 ring-slate-900/10 ring-offset-1" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${style.accent}`} aria-hidden />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-slate-300 !opacity-0" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-slate-300 !opacity-0" />

      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-xs font-medium text-slate-500">#{ticket.number}</span>
          {closesPhase && (
            <span
              data-testid="closes-phase"
              title={`Når denne er ferdig, er fase ${closesPhase} ferdig`}
              className="flex items-center gap-1 truncate rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white"
            >
              <FlagIcon />
              Avslutter fase {closesPhase}
            </span>
          )}
        </span>
        <StatusBadge status={ticket.status} />
      </div>

      {ticket.external && ticket.epic && (
        <Link
          href={`/${ticket.epic}`}
          className="nodrag relative z-10 mt-1 w-fit truncate text-[11px] font-medium text-violet-700 hover:underline"
        >
          ↗ {ticket.epic}
        </Link>
      )}

      <a
        href={ticket.url}
        target="_blank"
        rel="noreferrer"
        title={ticket.title}
        className="nodrag mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 after:absolute after:inset-0 after:content-[''] group-hover:text-blue-700"
      >
        <IssueTitle title={ticket.title} />
      </a>

      <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
        <div className="flex min-w-0 flex-wrap gap-1">
          {ticket.repos.slice(0, MAX_REPOS).map((repo) => (
            <span
              key={repo}
              className="truncate rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
            >
              {repo}
            </span>
          ))}
          {extraRepos > 0 && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              +{extraRepos}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {closedLabel && (
            <span className="whitespace-nowrap text-[11px] text-emerald-700" data-testid="closed-at">
              ✓ {closedLabel}
            </span>
          )}
          <div className="flex -space-x-1.5">
            {ticket.assignees.map((it) => (
              <Avatar key={it.login} assignee={it} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const faseStyle = {
  ferdig: {
    box: "border-emerald-300 bg-emerald-50/70",
    title: "text-emerald-800",
    badge: "bg-emerald-600 text-white",
  },
  pågår: { box: "border-sky-200 bg-white/80", title: "text-slate-600", badge: "bg-sky-100 text-sky-800" },
  "ikke startet": {
    box: "border-dashed border-slate-300 bg-white/60",
    title: "text-slate-500",
    badge: "bg-slate-100 text-slate-500",
  },
} as const;

function FaseGroup({ data }: NodeProps<FaseNode>) {
  const { phase, finishedLabel } = data;
  const style = faseStyle[phase.status];

  return (
    <div
      data-testid="fase"
      data-fase={phase.key}
      data-status={phase.status}
      className={`h-full w-full rounded-3xl border-2 ${style.box}`}
    >
      <div className="flex items-center gap-2 px-6 pt-3.5">
        <span className={`shrink-0 text-xs font-bold uppercase tracking-[0.12em] ${style.title}`}>
          Fase {phase.key}
        </span>
        {phase.name && (
          <span className={`truncate text-xs font-medium ${style.title}`} title={phase.name}>
            · {phase.name}
          </span>
        )}
        <span
          data-testid="fase-status"
          className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}
        >
          {phase.status === "ferdig" ? `✓ Ferdig ${finishedLabel ?? ""}`.trim() : `${phase.done}/${phase.total} ferdig`}
        </span>
      </div>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M3 1.5a.75.75 0 0 1 .75.75V3h8.69a.5.5 0 0 1 .4.8L11.5 5.75l1.34 1.95a.5.5 0 0 1-.4.8H3.75v6.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 3 1.5Z" />
    </svg>
  );
}

const nodeTypes = { ticket: TicketCard, fase: FaseGroup };

export function TicketGraph({ nodes, edges }: { nodes: FlowNode[]; edges: Edge[] }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ padding: 0.08 }}
      minZoom={0.2}
      maxZoom={1.75}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#cbd5e1" />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        className="!rounded-xl !border !border-slate-200 !shadow-sm"
        style={{ width: 168, height: 108 }}
        maskColor="rgba(241,245,249,0.7)"
        nodeBorderRadius={8}
        nodeColor={(node) =>
          node.type === "ticket" ? statusStyle[(node as TicketNode).data.ticket.status].color : "#f1f5f9"
        }
      />
    </ReactFlow>
  );
}
