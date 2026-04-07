import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde") || new Date(new Date().setDate(1)).toISOString().split("T")[0]
  const hasta = searchParams.get("hasta") || new Date().toISOString().split("T")[0]

  // Fetch team profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, avatar_url")
    .eq("organization_id", organizationId)
    .in("role", ["setter", "closer"])

  // Fetch all projects with comisiones
  const { data: proyectos } = await supabase
    .from("director_proyectos")
    .select("id, nombre, director_comisiones_proyecto(*), director_proyecto_miembros(user_id)")
    .eq("organization_id", organizationId)

  // Fetch reports
  const { data: setterReports } = await supabase
    .from("reportes_setter")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("fecha", desde)
    .lte("fecha", hasta)

  const { data: closerReports } = await supabase
    .from("reportes_closer")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("fecha", desde)
    .lte("fecha", hasta)

  // Fetch payment methods
  const { data: pagos } = await supabase
    .from("director_metodos_pago")
    .select("*")
    .eq("organization_id", organizationId)

  const sr = setterReports || []
  const cr = closerReports || []

  const defaultConfig = {
    setter_base_mensual: 500,
    setter_por_cita_show_calificada: 25,
    setter_por_venta_cerrada: 75,
    closer_comision_porcentaje: 8,
    closer_bonus_cierre: 500,
    closer_bonus_tasa_minima: 40,
  }

  // Calculate setter commissions
  const setters = (profiles || []).filter(p => p.role === "setter").map(setter => {
    const userPagos = (pagos || []).filter(pg => pg.user_id === setter.id)
    const desglose = (proyectos || []).filter(proj =>
      (proj.director_proyecto_miembros || []).some((m: { user_id: string }) => m.user_id === setter.id)
    ).map(proj => {
      const config = (proj.director_comisiones_proyecto as unknown[])?.[0] as Record<string, number> | undefined || defaultConfig
      const projReports = sr.filter(r => r.user_id === setter.id && r.proyecto_id === proj.id)
      const citasCal = projReports.reduce((s, r) => s + (r.citas_calificadas || 0), 0)
      // Count ventas from closer reports where the setter's citas led to
      const ventasCerradas = cr.filter(r => r.proyecto_id === proj.id).reduce((s, r) => s + (r.ventas_cerradas || 0), 0)

      const base = Number(config.setter_base_mensual) || 0
      const porCitas = citasCal * (Number(config.setter_por_cita_show_calificada) || 0)
      const porVentas = ventasCerradas * (Number(config.setter_por_venta_cerrada) || 0)

      return { proyecto: proj.nombre, base, porCitas, porVentas, subtotal: base + porCitas + porVentas }
    })

    const citasCal = sr.filter(r => r.user_id === setter.id).reduce((s, r) => s + (r.citas_calificadas || 0), 0)
    const totalComision = desglose.reduce((s, d) => s + d.subtotal, 0)

    return {
      id: setter.id,
      nombre: setter.full_name || "",
      foto_url: setter.avatar_url,
      activo: setter.is_active !== false,
      citas_calificadas: citasCal,
      total_comision: totalComision,
      desglose,
      pagos: userPagos.map(p => ({ id: p.id, tipo: p.tipo, datos: p.datos, titular: p.titular, principal: p.principal })),
    }
  })

  // Calculate closer commissions
  const closers = (profiles || []).filter(p => p.role === "closer").map(closer => {
    const userPagos = (pagos || []).filter(pg => pg.user_id === closer.id)
    const desglose = (proyectos || []).filter(proj =>
      (proj.director_proyecto_miembros || []).some((m: { user_id: string }) => m.user_id === closer.id)
    ).map(proj => {
      const config = (proj.director_comisiones_proyecto as unknown[])?.[0] as Record<string, number> | undefined || defaultConfig
      const projReports = cr.filter(r => r.user_id === closer.id && r.proyecto_id === proj.id)
      const cobrado = projReports.reduce((s, r) => s + Number(r.monto_cobrado || 0), 0)
      const shows = projReports.reduce((s, r) => s + (r.shows || 0), 0)
      const ventas = projReports.reduce((s, r) => s + (r.ventas_cerradas || 0), 0)
      const tasaCierre = shows > 0 ? Math.round((ventas / shows) * 100) : 0

      const comisionBase = cobrado * (Number(config.closer_comision_porcentaje) || 0) / 100
      const bonusCalifica = tasaCierre >= (Number(config.closer_bonus_tasa_minima) || 40)
      const bonus = bonusCalifica ? (Number(config.closer_bonus_cierre) || 0) : 0

      return { proyecto: proj.nombre, comisionBase, bonus, bonusCalifica, tasaCierre, subtotal: comisionBase + bonus }
    })

    const closerReps = cr.filter(r => r.user_id === closer.id)
    const ventasCerradas = closerReps.reduce((s, r) => s + (r.ventas_cerradas || 0), 0)
    const montoCobrado = closerReps.reduce((s, r) => s + Number(r.monto_cobrado || 0), 0)
    const closerShows = closerReps.reduce((s, r) => s + (r.shows || 0), 0)
    const tasaCierre = closerShows > 0 ? Math.round((ventasCerradas / closerShows) * 100) : 0
    const totalComision = desglose.reduce((s, d) => s + d.subtotal, 0)

    return {
      id: closer.id,
      nombre: closer.full_name || "",
      foto_url: closer.avatar_url,
      activo: closer.is_active !== false,
      ventas_cerradas: ventasCerradas,
      monto_cobrado: montoCobrado,
      tasa_cierre: tasaCierre,
      total_comision: totalComision,
      desglose,
      pagos: userPagos.map(p => ({ id: p.id, tipo: p.tipo, datos: p.datos, titular: p.titular, principal: p.principal })),
    }
  })

  return NextResponse.json({ setters, closers })
}
