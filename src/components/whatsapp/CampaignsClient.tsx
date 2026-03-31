"use client"

import { useState } from "react"
import Link from "next/link"

type WaCampaign = {
  id: string
  name: string
  status: "draft" | "running" | "paused" | "done"
  contact_ids: string[]
  variations: { body: string; media_url?: string }[]
  block_size: number
  pause_minutes: number
  delay_seconds: number
  sent_count: number
  error_count: number
  created_at: string
  wa_lines?: { id: string; label: string | null; phone: string | null; status: string } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:   { label: "Borrador",   color: "var(--text-muted)",  bg: "var(--surface-2)" },
  running: { label: "En curso",   color: "var(--accent)",      bg: "rgba(108,99,255,0.12)" },
  paused:  { label: "Pausada",    color: "#eab308",            bg: "rgba(234,179,8,0.12)" },
  done:    { label: "Completada", color: "#22c55e",            bg: "rgba(34,197,94,0.12)" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.draft
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

export default function CampaignsClient({ campaigns: initialCampaigns }: { campaigns: WaCampaign[] }) {
  const [campaigns, setCampaigns] = useState<WaCampaign[]>(initialCampaigns)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleStart = async (campaign: WaCampaign) => {
    setActionLoading(campaign.id + "_start")
    try {
      const res = await fetch("/api/whatsapp/send/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: "running" } : c))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async (campaign: WaCampaign) => {
    setActionLoading(campaign.id + "_pause")
    try {
      const res = await fetch("/api/whatsapp/send/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id }),
      })
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: "paused" } : c))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta campaña?")) return
    const res = await fetch(`/api/whatsapp/campaigns/${id}`, { method: "DELETE" })
    if (res.ok) setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Campañas</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/whatsapp/campaigns/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva Campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(108,99,255,0.1)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <polygon points="22 2 11 13 2 9 22 2"/><line x1="11" y1="13" x2="11" y2="22"/>
              <line x1="22" y1="2" x2="15" y2="22"/>
            </svg>
          </div>
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Sin campañas</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Crea tu primera campaña de envío masivo</p>
          <Link
            href="/whatsapp/campaigns/new"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Nueva Campaña
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map(campaign => {
            const total = campaign.contact_ids?.length || 0
            const progress = total > 0 ? Math.round((campaign.sent_count / total) * 100) : 0

            return (
              <div
                key={campaign.id}
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{campaign.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {campaign.wa_lines ? (campaign.wa_lines.label || campaign.wa_lines.phone || "Línea sin nombre") : "Sin línea asignada"}
                    </p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl py-2" style={{ background: "var(--surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{total}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Contactos</p>
                  </div>
                  <div className="rounded-xl py-2" style={{ background: "var(--surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{campaign.variations?.length || 0}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Variaciones</p>
                  </div>
                  <div className="rounded-xl py-2" style={{ background: "var(--surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: campaign.error_count > 0 ? "var(--danger)" : "var(--text-primary)" }}>
                      {campaign.error_count}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Errores</p>
                  </div>
                </div>

                {total > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      <span>{campaign.sent_count} enviados</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: campaign.status === "done" ? "#22c55e" : "var(--accent)" }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  {(campaign.status === "draft" || campaign.status === "paused") && (
                    <button
                      onClick={() => handleStart(campaign)}
                      disabled={actionLoading === campaign.id + "_start"}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-50"
                      style={{ background: "#25d366" }}
                    >
                      {actionLoading === campaign.id + "_start" ? "..." : "Iniciar"}
                    </button>
                  )}
                  {campaign.status === "running" && (
                    <button
                      onClick={() => handlePause(campaign)}
                      disabled={actionLoading === campaign.id + "_pause"}
                      className="flex-1 py-2 rounded-xl text-xs font-medium disabled:opacity-50"
                      style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}
                    >
                      {actionLoading === campaign.id + "_pause" ? "..." : "Pausar"}
                    </button>
                  )}
                  <Link
                    href={`/whatsapp/monitor?campaign=${campaign.id}`}
                    className="flex-1 py-2 rounded-xl text-xs font-medium text-center"
                    style={{ background: "rgba(108,99,255,0.1)", color: "var(--accent)" }}
                  >
                    Monitor
                  </Link>
                  {campaign.status === "draft" && (
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
