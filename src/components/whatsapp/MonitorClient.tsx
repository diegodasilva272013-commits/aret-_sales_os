"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Campaign = {
  id: string
  name: string
  status: string
  sent_count: number
  error_count: number
  contact_ids: string[]
}

type QueueItem = {
  id: string
  phone: string
  name: string | null
  status: "pending" | "sent" | "error" | "skipped"
  error_msg: string | null
  sent_at: string | null
  variation_index: number
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pendiente",
    color: "var(--text-muted)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  sent: {
    label: "Enviado",
    color: "#22c55e",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  error: {
    label: "Error",
    color: "var(--danger)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  skipped: {
    label: "Saltado",
    color: "#eab308",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
      </svg>
    ),
  },
}

function StatusIcon({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending
  return <span style={{ color: cfg.color }}>{cfg.icon}</span>
}

const campaignStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:   { label: "Borrador",   color: "var(--text-muted)", bg: "var(--surface-2)" },
  running: { label: "En curso",   color: "var(--accent)",     bg: "rgba(108,99,255,0.12)" },
  paused:  { label: "Pausada",    color: "#eab308",           bg: "rgba(234,179,8,0.12)" },
  done:    { label: "Completada", color: "#22c55e",           bg: "rgba(34,197,94,0.12)" },
}

export default function MonitorClient({ campaigns, orgId }: { campaigns: Campaign[]; orgId: string }) {
  const searchParams = useSearchParams()
  const defaultCampaign = searchParams.get("campaign") || (campaigns[0]?.id ?? "")

  const [selectedId, setSelectedId] = useState(defaultCampaign)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [campaignData, setCampaignData] = useState<Campaign[]>(campaigns)

  const selectedCampaign = campaignData.find(c => c.id === selectedId)

  const fetchQueue = useCallback(async (id: string) => {
    if (!id) return
    setLoadingQueue(true)
    try {
      const res = await fetch(`/api/whatsapp/send/status?campaign_id=${id}`)
      const data = await res.json()
      if (data.queue) setQueue(data.queue)
      if (data.campaign) {
        setCampaignData(prev => prev.map(c => c.id === data.campaign.id ? { ...c, ...data.campaign } : c))
      }
    } catch {
      // ignore
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) fetchQueue(selectedId)
  }, [selectedId, fetchQueue])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!selectedId || !orgId) return

    const supabase = createClient()

    const queueSub = supabase
      .channel(`monitor_queue_${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_send_queue",
          filter: `campaign_id=eq.${selectedId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as QueueItem
            setQueue(prev => prev.map(q => q.id === updated.id ? { ...q, ...updated } : q))
          } else if (payload.eventType === "INSERT") {
            setQueue(prev => [payload.new as QueueItem, ...prev])
          }
        }
      )
      .subscribe()

    const campaignSub = supabase
      .channel(`monitor_campaign_${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wa_campaigns",
          filter: `id=eq.${selectedId}`,
        },
        (payload) => {
          const updated = payload.new as Campaign
          setCampaignData(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(queueSub)
      supabase.removeChannel(campaignSub)
    }
  }, [selectedId, orgId])

  const handleStart = async () => {
    setActionLoading("start")
    try {
      await fetch("/api/whatsapp/send/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: selectedId }),
      })
      setCampaignData(prev => prev.map(c => c.id === selectedId ? { ...c, status: "running" } : c))
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async () => {
    setActionLoading("pause")
    try {
      await fetch("/api/whatsapp/send/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: selectedId }),
      })
      setCampaignData(prev => prev.map(c => c.id === selectedId ? { ...c, status: "paused" } : c))
    } finally {
      setActionLoading(null)
    }
  }

  const total = selectedCampaign?.contact_ids?.length || 0
  const sent = selectedCampaign?.sent_count || 0
  const errors = selectedCampaign?.error_count || 0
  const pending = queue.filter(q => q.status === "pending").length
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0
  const campaignStatus = selectedCampaign?.status || "draft"
  const statusCfg = campaignStatusConfig[campaignStatus] || campaignStatusConfig.draft

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Monitor de Campañas</h2>
        <button
          onClick={() => selectedId && fetchQueue(selectedId)}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
          style={{ color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.07-8.3"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Campaign selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Campaña</label>
        {campaigns.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay campañas creadas aún.</p>
        ) : (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none max-w-md"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">Seleccionar campaña...</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.status}</option>
            ))}
          </select>
        )}
      </div>

      {selectedCampaign && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{sent}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Enviados</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--danger)" }}>{errors}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Errores</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{pending}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Pendientes</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{total}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Total</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6 p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {selectedCampaign.name}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: statusCfg.color, background: statusCfg.bg }}
                >
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(campaignStatus === "draft" || campaignStatus === "paused") && (
                  <button
                    onClick={handleStart}
                    disabled={actionLoading === "start"}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "#25d366" }}
                  >
                    {actionLoading === "start" ? "..." : "Iniciar"}
                  </button>
                )}
                {campaignStatus === "running" && (
                  <button
                    onClick={handlePause}
                    disabled={actionLoading === "pause"}
                    className="px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-50"
                    style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}
                  >
                    {actionLoading === "pause" ? "..." : "Pausar"}
                  </button>
                )}
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: campaignStatus === "done"
                    ? "#22c55e"
                    : campaignStatus === "running"
                    ? "var(--accent)"
                    : "var(--text-muted)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{sent} de {total} enviados</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Queue list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Cola de envío</p>
              {loadingQueue && (
                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
              )}
            </div>

            {queue.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {loadingQueue ? "Cargando..." : "Cola vacía"}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {queue.slice(0, 100).map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <StatusIcon status={item.status} />
                    <span className="text-sm font-mono flex-1" style={{ color: "var(--text-primary)" }}>{item.phone}</span>
                    <span className="text-sm flex-1" style={{ color: "var(--text-muted)" }}>{item.name || "—"}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        color: statusConfig[item.status]?.color || "var(--text-muted)",
                        background: item.status === "sent"
                          ? "rgba(34,197,94,0.1)"
                          : item.status === "error"
                          ? "rgba(239,68,68,0.1)"
                          : "var(--surface-2)",
                      }}
                    >
                      {statusConfig[item.status]?.label || item.status}
                    </span>
                    {item.error_msg && (
                      <span className="text-xs max-w-[200px] truncate" style={{ color: "var(--danger)" }} title={item.error_msg}>
                        {item.error_msg}
                      </span>
                    )}
                    {item.sent_at && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(item.sent_at).toLocaleTimeString("es-AR")}
                      </span>
                    )}
                  </div>
                ))}
                {queue.length > 100 && (
                  <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
                    Mostrando primeros 100 de {queue.length} items
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
