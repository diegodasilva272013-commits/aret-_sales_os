import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Brief {
  nombre_producto?: string
  descripcion_producto?: string
  precio_desde?: number | null
  precio_hasta?: number | null
  pagina_web?: string
  instagram?: string
  facebook?: string
  youtube?: string
  linkedin?: string
  tiktok?: string
  avatar_nombre?: string
  avatar_edad_rango?: string
  avatar_ocupacion?: string
  avatar_dolores?: string
  avatar_deseos?: string
  avatar_objeciones?: string
  experto_nombre?: string
  experto_bio?: string
  experto_logros?: string
  experto_foto_url?: string
  mensajes_apertura?: string
  preguntas_frecuentes?: string
  argumentos_cierre?: string
  manejo_objeciones?: string
  proceso_setter?: string
  proceso_closer?: string
  notas_adicionales?: string
  diferenciadores?: string
  motivos_compra?: string
  oferta?: string
  observaciones_estrategicas?: string
  videos?: string
  links_importantes?: string
  publico_objetivo?: string
}

interface Comisiones {
  porcentaje_setter?: number
  porcentaje_closer?: number
  monto_minimo?: number
  notas?: string
}

interface Proyecto {
  nombre: string
  tipo?: string
  empresa?: string
}

function splitLines(text?: string): string[] {
  if (!text) return []
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

export function generateBriefPDF(
  brief: Brief,
  proyecto: Proyecto,
  comisiones?: Comisiones | null,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 0

  function checkPage(needed: number) {
    const pageH = doc.internal.pageSize.getHeight()
    if (y + needed > pageH - 15) {
      doc.addPage()
      y = 20
    }
  }

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(8, 11, 20)
  doc.rect(0, 0, pageW, 42, 'F')
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 42, pageW, 1.2, 'F')

  doc.setTextColor(241, 245, 249)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(proyecto.nombre || 'Brief de Proyecto', margin, 18)

  if (proyecto.tipo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(129, 140, 248)
    doc.text(proyecto.tipo.toUpperCase(), margin, 26)
  }

  if (brief.nombre_producto) {
    doc.setFontSize(11)
    doc.setTextColor(148, 163, 184)
    doc.text(brief.nombre_producto, margin, 33)
  }

  if (brief.precio_desde || brief.precio_hasta) {
    const priceStr = `$${(brief.precio_desde || 0).toLocaleString()} – $${(brief.precio_hasta || 0).toLocaleString()}`
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(52, 211, 153)
    doc.text(priceStr, pageW - margin, 33, { align: 'right' })
  }

  y = 52

  // ── Helper: Section Title ────────────────────────────────
  function sectionTitle(title: string) {
    checkPage(14)
    doc.setFillColor(13, 17, 23)
    doc.roundedRect(margin - 2, y - 2, contentW + 4, 10, 2, 2, 'F')
    doc.setFillColor(99, 102, 241)
    doc.rect(margin - 2, y - 2, 1.5, 10, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(129, 140, 248)
    doc.text(title.toUpperCase(), margin + 4, y + 4.5)
    y += 14
  }

  function bodyText(text: string, maxW?: number) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    const lines = doc.splitTextToSize(text, maxW || contentW)
    checkPage(lines.length * 4.5)
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 3
  }

  function bulletList(items: string[]) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    items.forEach(item => {
      checkPage(6)
      doc.setTextColor(99, 102, 241)
      doc.text('•', margin + 2, y)
      doc.setTextColor(148, 163, 184)
      const lines = doc.splitTextToSize(item, contentW - 8)
      doc.text(lines, margin + 7, y)
      y += lines.length * 4.5 + 1.5
    })
    y += 2
  }

  function numberedList(items: string[]) {
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    items.forEach((item, i) => {
      checkPage(6)
      doc.setTextColor(99, 102, 241)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}.`, margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(148, 163, 184)
      const lines = doc.splitTextToSize(item, contentW - 12)
      doc.text(lines, margin + 10, y)
      y += lines.length * 4.5 + 2
    })
    y += 2
  }

  // ── Description ──────────────────────────────────────────
  if (brief.descripcion_producto) {
    sectionTitle('Descripción del Producto')
    bodyText(brief.descripcion_producto)
  }

  // ── Social Links ─────────────────────────────────────────
  const socials: string[] = []
  if (brief.pagina_web) socials.push(`Web: ${brief.pagina_web}`)
  if (brief.instagram) socials.push(`Instagram: @${brief.instagram}`)
  if (brief.facebook) socials.push(`Facebook: ${brief.facebook}`)
  if (brief.youtube) socials.push(`YouTube: ${brief.youtube}`)
  if (brief.linkedin) socials.push(`LinkedIn: ${brief.linkedin}`)
  if (brief.tiktok) socials.push(`TikTok: @${brief.tiktok}`)

  if (socials.length > 0) {
    sectionTitle('Redes y Enlaces')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(129, 140, 248)
    socials.forEach(s => {
      checkPage(5)
      doc.text(s, margin + 2, y)
      y += 5
    })
    y += 3
  }

  // ── Videos ───────────────────────────────────────────────
  const videoList = splitLines(brief.videos)
  if (videoList.length > 0) {
    sectionTitle('Videos')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(129, 140, 248)
    videoList.forEach((v, i) => {
      checkPage(5)
      doc.text(`Video ${i + 1}: ${v}`, margin + 2, y)
      y += 5
    })
    y += 3
  }

  // ── Links Importantes ────────────────────────────────────
  const linksList = splitLines(brief.links_importantes)
  if (linksList.length > 0) {
    sectionTitle('Links Importantes')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(129, 140, 248)
    linksList.forEach(l => {
      checkPage(5)
      doc.text(l, margin + 2, y)
      y += 5
    })
    y += 3
  }

  // ── La Oferta ────────────────────────────────────────────
  if (brief.oferta) {
    sectionTitle('La Oferta')
    bodyText(brief.oferta)
  }

  // ── Público Objetivo ─────────────────────────────────────
  if (brief.publico_objetivo) {
    sectionTitle('Público Objetivo')
    bodyText(brief.publico_objetivo)
  }

  // ── El Experto ───────────────────────────────────────────
  if (brief.experto_nombre || brief.experto_bio) {
    sectionTitle('El Experto')
    if (brief.experto_nombre) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(241, 245, 249)
      doc.text(brief.experto_nombre, margin, y)
      y += 7
    }
    if (brief.experto_bio) bodyText(brief.experto_bio)
    const logros = splitLines(brief.experto_logros)
    if (logros.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('LOGROS', margin, y)
      y += 5
      bulletList(logros)
    }
  }

  // ── Avatar del Cliente ───────────────────────────────────
  if (brief.avatar_nombre || brief.avatar_dolores || brief.avatar_deseos) {
    sectionTitle('Avatar del Cliente Ideal')
    if (brief.avatar_nombre) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(241, 245, 249)
      doc.text(brief.avatar_nombre, margin, y)
      y += 5
    }
    if (brief.avatar_edad_rango || brief.avatar_ocupacion) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`${brief.avatar_edad_rango || ''} · ${brief.avatar_ocupacion || ''}`, margin, y)
      y += 6
    }
    const dolores = splitLines(brief.avatar_dolores)
    if (dolores.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(248, 113, 113)
      doc.text('DOLORES', margin, y)
      y += 5
      bulletList(dolores)
    }
    const deseos = splitLines(brief.avatar_deseos)
    if (deseos.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(52, 211, 153)
      doc.text('DESEOS', margin, y)
      y += 5
      bulletList(deseos)
    }
    const objeciones = splitLines(brief.avatar_objeciones)
    if (objeciones.length > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(251, 191, 36)
      doc.text('OBJECIONES COMUNES', margin, y)
      y += 5
      bulletList(objeciones)
    }
  }

  // ── Motivos de Compra ────────────────────────────────────
  const motivosCompra = splitLines(brief.motivos_compra)
  if (motivosCompra.length > 0) {
    sectionTitle('¿Por qué Comprarían?')
    bulletList(motivosCompra)
  }

  // ── Diferenciadores ──────────────────────────────────────
  const diferenciadores = splitLines(brief.diferenciadores)
  if (diferenciadores.length > 0) {
    sectionTitle('Diferenciadores')
    bulletList(diferenciadores)
  }

  // ── Mensajes de Apertura ─────────────────────────────────
  if (brief.mensajes_apertura) {
    sectionTitle('Mensajes de Apertura')
    bodyText(brief.mensajes_apertura)
  }

  // ── Proceso Setter ───────────────────────────────────────
  const pasosSetter = splitLines(brief.proceso_setter)
  if (pasosSetter.length > 0) {
    sectionTitle('Proceso Setter')
    numberedList(pasosSetter)
  }

  // ── Proceso Closer ───────────────────────────────────────
  const pasosCloser = splitLines(brief.proceso_closer)
  if (pasosCloser.length > 0) {
    sectionTitle('Proceso Closer')
    numberedList(pasosCloser)
  }

  // ── Manejo de Objeciones ─────────────────────────────────
  if (brief.manejo_objeciones) {
    sectionTitle('Manejo de Objeciones')
    bodyText(brief.manejo_objeciones)
  }

  // ── Preguntas Frecuentes ─────────────────────────────────
  if (brief.preguntas_frecuentes) {
    sectionTitle('Preguntas Frecuentes')
    bodyText(brief.preguntas_frecuentes)
  }

  // ── Argumentos de Cierre ─────────────────────────────────
  const argsCierre = splitLines(brief.argumentos_cierre)
  if (argsCierre.length > 0) {
    sectionTitle('Argumentos de Cierre')
    bulletList(argsCierre)
  }

  // ── Comisiones ───────────────────────────────────────────
  if (comisiones) {
    sectionTitle('Comisiones')
    const comData: string[][] = []
    if (comisiones.porcentaje_setter !== undefined)
      comData.push(['Setter', `${comisiones.porcentaje_setter}%`])
    if (comisiones.porcentaje_closer !== undefined)
      comData.push(['Closer', `${comisiones.porcentaje_closer}%`])
    if (comisiones.monto_minimo !== undefined)
      comData.push(['Monto mínimo', `$${comisiones.monto_minimo.toLocaleString()}`])

    if (comData.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Rol', 'Valor']],
        body: comData,
        theme: 'plain',
        styles: {
          fontSize: 9,
          textColor: [148, 163, 184],
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [13, 17, 23],
          textColor: [129, 140, 248],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [13, 17, 23],
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 4
    }

    if (comisiones.notas) {
      bodyText(comisiones.notas)
    }
  }

  // ── Notas Adicionales ────────────────────────────────────
  if (brief.notas_adicionales) {
    sectionTitle('Notas Adicionales')
    bodyText(brief.notas_adicionales)
  }

  // ── Observaciones Estratégicas ───────────────────────────
  if (brief.observaciones_estrategicas) {
    sectionTitle('Observaciones Estratégicas')
    bodyText(brief.observaciones_estrategicas)
  }

  // ── Footer ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(8, 11, 20)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text('Areté Sales OS — Brief Confidencial', margin, pageH - 5)
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  const filename = `brief-${(proyecto.nombre || 'proyecto').toLowerCase().replace(/\s+/g, '-')}.pdf`
  doc.save(filename)
}
