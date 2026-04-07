'use client'

interface CashEntry {
  closer: string
  foto_url?: string
  efectivo: number
  transferencia: number
  tarjeta: number
  total: number
}

interface CashTableProps {
  data: CashEntry[]
}

export default function CashTable({ data }: CashTableProps) {
  const totalEfectivo = data.reduce((s, d) => s + d.efectivo, 0)
  const totalTransferencia = data.reduce((s, d) => s + d.transferencia, 0)
  const totalTarjeta = data.reduce((s, d) => s + d.tarjeta, 0)
  const grandTotal = data.reduce((s, d) => s + d.total, 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cash Collected</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Closer</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Efectivo</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Transferencia</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Tarjeta</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden' }}>
                      {row.foto_url ? <img src={row.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : row.closer.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.closer}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>${row.efectivo.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>${row.transferencia.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>${row.tarjeta.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>${row.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-2)' }}>
              <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>TOTAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>${totalEfectivo.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>${totalTransferencia.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>${totalTarjeta.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>${grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
