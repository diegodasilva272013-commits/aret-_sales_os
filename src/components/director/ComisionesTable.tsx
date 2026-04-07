'use client'

interface ComisionRow {
  miembro: string
  foto_url?: string
  rol: string
  total: number
  desglose: { proyecto: string; subtotal: number }[]
}

interface ComisionesTableProps {
  data: ComisionRow[]
}

export default function ComisionesTable({ data }: ComisionesTableProps) {
  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Comisiones</h3>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>${total.toLocaleString()}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Miembro</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Rol</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Comisión Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden' }}>
                      {row.foto_url ? <img src={row.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : row.miembro.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.miembro}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{row.rol}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${row.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
