'use client'

interface Props {
  role: string
  value: string
  onChange: (v: string) => void
  onClose: () => void
}

function fmt(v: string) {
  const n = parseInt(v.replace(/\D/g, '') || '0', 10)
  return isNaN(n) ? '0' : n.toLocaleString('ru-RU')
}

export function InlineNumpad({ role, value, onChange, onClose }: Props) {
  function raw() { return value.replace(/\D/g, '') || '0' }

  function press(d: string) {
    const cur = raw()
    onChange(cur === '0' ? d : (cur + d).slice(0, 6))
  }

  function del() {
    const cur = raw()
    onChange(cur.slice(0, -1) || '0')
  }

  const keys = ['1','2','3','4','5','6','7','8','9']

  return (
    <div style={{
      background: '#f7f4f1',
      borderTop: '1px solid #e5d9cc',
    }}>
      <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9b7653', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: "'Roboto Slab', serif" }}>
          {role}
        </span>
        <span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#2c1a0e', fontFamily: "'Roboto Slab', serif" }}>{fmt(value)}</span>
          <span style={{ fontSize: 14, color: '#b8a08a', marginLeft: 3, fontFamily: "'Roboto Slab', serif" }}> ₽</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 10px 12px' }}>
        {keys.map(d => (
          <button
            key={d}
            type="button"
            onPointerDown={(e) => { e.preventDefault(); press(d) }}
            style={{
              height: 48,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid #e5d9cc',
              fontSize: 18,
              fontWeight: 600,
              color: '#2c1a0e',
              fontFamily: "'Roboto Slab', serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >{d}</button>
        ))}

        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); del() }}
          style={{
            height: 48,
            borderRadius: 12,
            background: '#fdf0e8',
            border: '1px solid #f0ddd0',
            fontSize: 20,
            color: '#9b7653',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >⌫</button>

        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); press('0') }}
          style={{
            height: 48,
            borderRadius: 12,
            background: '#fff',
            border: '1px solid #e5d9cc',
            fontSize: 18,
            fontWeight: 600,
            color: '#2c1a0e',
            fontFamily: "'Roboto Slab', serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >0</button>

        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); onClose() }}
          style={{
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #bd9673, #7d5e42)',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Roboto Slab', serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '.03em',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >Готово</button>
      </div>
    </div>
  )
}
