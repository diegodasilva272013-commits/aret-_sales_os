import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes") || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`

  const mesStart = mes.slice(0, 7) + "-01"
  const mesDate = new Date(mesStart)
  const mesEnd = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0).toISOString().split("T")[0]

  // Meta del mes
  const { data: metaRow } = await supabase
    .from("director_metas_mensuales")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("mes", mesStart)
    .single()

  const meta_objetivo = Number(metaRow?.meta_objetivo) || 0
  const costos_ads = Number(metaRow?.costos_ads) || 0
  const costos_operativos = Number(metaRow?.costos_operativos) || 0

  // Transacciones del mes
  const { data: txs } = await supabase
    .from("director_transacciones")
    .select("*, clientes_cartera(nombre_cliente)")
    .eq("organization_id", organizationId)
    .gte("fecha", mesStart)
    .lte("fecha", mesEnd + "T23:59:59")
    .order("fecha", { ascending: false })
    .limit(50)

  const transactions = txs || []
  const ingresos = transactions.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0)
  const egresos = transactions.filter(t => t.tipo === "egreso").reduce((s, t) => s + Number(t.monto), 0)
  const reembolsos = transactions.filter(t => t.tipo === "reembolso").reduce((s, t) => s + Number(t.monto), 0)

  // Cartera
  const { data: clientes } = await supabase
    .from("clientes_cartera")
    .select("id, estado, monto_referencia")
    .eq("organization_id", organizationId)

  const clientesList = clientes || []
  const totalClientes = clientesList.length
  const activos = clientesList.filter(c => c.estado === "activo").length
  const vencidos = clientesList.filter(c => c.estado === "vencido").length
  const pagados = clientesList.filter(c => c.estado === "pagado").length
  const carteraTotal = clientesList.reduce((s, c) => s + Number(c.monto_referencia || 0), 0)
  const carteraVencida = clientesList.filter(c => c.estado === "vencido").reduce((s, c) => s + Number(c.monto_referencia || 0), 0)

  // Rankings from closer reports
  const { data: closerReports } = await supabase
    .from("reportes_closer")
    .select("user_id, ventas_cerradas, monto_cobrado")
    .eq("organization_id", organizationId)
    .gte("fecha", mesStart)
    .lte("fecha", mesEnd)

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("organization_id", organizationId)

  const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  // Closer ranking
  const closerAgg = new Map<string, { ventas: number; facturado: number; clientes: number }>()
  for (const r of closerReports || []) {
    const prev = closerAgg.get(r.user_id) || { ventas: 0, facturado: 0, clientes: 0 }
    prev.ventas += r.ventas_cerradas || 0
    prev.facturado += Number(r.monto_cobrado || 0)
    closerAgg.set(r.user_id, prev)
  }
  const rankingClosers = Array.from(closerAgg.entries()).map(([id, d]) => ({
    id,
    nombre: profMap[id]?.full_name || "?",
    foto_url: profMap[id]?.avatar_url || null,
    ventas: d.ventas,
    totalClientes: d.clientes,
    facturado: d.facturado,
    porcentajeMeta: meta_objetivo > 0 ? Math.round((d.facturado / meta_objetivo) * 100) : 0,
  })).sort((a, b) => b.facturado - a.facturado)

  // Setter ranking
  const { data: setterReports } = await supabase
    .from("reportes_setter")
    .select("user_id, leads_nuevos, citas_agendadas, citas_show")
    .eq("organization_id", organizationId)
    .gte("fecha", mesStart)
    .lte("fecha", mesEnd)

  const setterAgg = new Map<string, { leads: number; citas: number; facturado: number }>()
  for (const r of setterReports || []) {
    const prev = setterAgg.get(r.user_id) || { leads: 0, citas: 0, facturado: 0 }
    prev.leads += r.leads_nuevos || 0
    prev.citas += r.citas_agendadas || 0
    setterAgg.set(r.user_id, prev)
  }
  const rankingSetters = Array.from(setterAgg.entries()).map(([id, d]) => ({
    id,
    nombre: profMap[id]?.full_name || "?",
    foto_url: profMap[id]?.avatar_url || null,
    ventas: d.citas,
    totalClientes: d.leads,
    facturado: d.citas * 25, // estimated value
    porcentajeMeta: meta_objetivo > 0 ? Math.round(((d.citas * 25) / meta_objetivo) * 100) : 0,
  })).sort((a, b) => b.facturado - a.facturado)

  // Timeline diario
  const timeline: { fecha: string; ingresos: number; egresos: number; reembolsos: number; acumulado: number; meta: number }[] = []
  let acumulado = 0
  const daysInMonth = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0).getDate()
  const metaDiaria = meta_objetivo / daysInMonth
  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = `${mesStart.slice(0, 7)}-${String(d).padStart(2, "0")}`
    const dayTxs = transactions.filter(t => t.fecha.startsWith(fecha))
    const dayIng = dayTxs.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0)
    const dayEgr = dayTxs.filter(t => t.tipo === "egreso").reduce((s, t) => s + Number(t.monto), 0)
    const dayRef = dayTxs.filter(t => t.tipo === "reembolso").reduce((s, t) => s + Number(t.monto), 0)
    acumulado += dayIng
    timeline.push({ fecha, ingresos: dayIng, egresos: dayEgr, reembolsos: dayRef, acumulado, meta: Math.round(metaDiaria * d) })
  }

  // Tendencia metas (últimos 6 meses)
  const tendencia: { mes: string; meta: number; alcanzado: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(mesDate)
    d.setMonth(d.getMonth() - i)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    const { data: mr } = await supabase.from("director_metas_mensuales").select("meta_objetivo").eq("organization_id", organizationId).eq("mes", m).single()
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
    const { data: mTxs } = await supabase.from("director_transacciones").select("monto").eq("organization_id", organizationId).eq("tipo", "ingreso").gte("fecha", m).lte("fecha", mEnd + "T23:59:59")
    const alcanzado = (mTxs || []).reduce((s, t) => s + Number(t.monto), 0)
    tendencia.push({
      mes: d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }),
      meta: Number(mr?.meta_objetivo) || 0,
      alcanzado,
    })
  }

  // Alertas
  const alertas: { tipo: string; nivel: string; mensaje: string; icono: string }[] = []
  if (carteraVencida > 0) alertas.push({ tipo: "cartera", nivel: "warning", mensaje: `$${Math.round(carteraVencida).toLocaleString()} en cartera vencida`, icono: "alert" })
  if (reembolsos > 0) alertas.push({ tipo: "reembolso", nivel: "warning", mensaje: `$${Math.round(reembolsos).toLocaleString()} en reembolsos este mes`, icono: "refund" })
  if (meta_objetivo > 0 && ingresos < meta_objetivo * 0.5) alertas.push({ tipo: "meta", nivel: "critico", mensaje: "Facturación por debajo del 50% de la meta", icono: "target" })

  const facturacion_alcanzada = ingresos
  const faltante = Math.max(0, meta_objetivo - facturacion_alcanzada)
  const ganancia_neta = facturacion_alcanzada - costos_ads - costos_operativos - egresos

  return NextResponse.json({
    meta: {
      mes: mesStart,
      meta_objetivo,
      facturacion_alcanzada,
      faltante,
      porcentaje_rendimiento: meta_objetivo > 0 ? Math.round((facturacion_alcanzada / meta_objetivo) * 100) : 0,
      costos_ads,
      costos_operativos,
      ganancia_neta,
      total_egresos: egresos,
      total_reembolsos: reembolsos,
    },
    cartera: {
      total: carteraTotal,
      vencida: carteraVencida,
      cobrada_mes: ingresos,
      total_clientes: totalClientes,
      activos,
      vencidos,
      pagados,
    },
    rankingClosers,
    rankingSetters,
    ultimasTransacciones: transactions.map(t => ({
      id: t.id,
      cliente_id: t.cliente_id,
      cuota_id: t.cuota_id,
      monto: Number(t.monto),
      tipo: t.tipo,
      fecha: t.fecha,
      descripcion: t.descripcion,
      cliente_nombre: (t.clientes_cartera as any)?.nombre_cliente || "N/A",
    })),
    timeline,
    tendenciaMetas: tendencia,
    distribucionCartera: [
      { name: "Activos", value: activos, color: "#34D399" },
      { name: "Vencidos", value: vencidos, color: "#F87171" },
      { name: "Pagados", value: pagados, color: "#6366F1" },
    ],
    ingresosPorCloser: rankingClosers.map(r => ({ name: r.nombre, value: r.facturado })),
    ingresosPorFuente: [],
    ingresosPorCanal: [],
    alertas,
  })
}
