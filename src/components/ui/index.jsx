import { useState } from 'react'

/* ── Button ── */
export function Button({ children, variant = 'primary', size = 'md', className = '', loading, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    border: 'none', borderRadius: 'var(--radius)', fontFamily: 'var(--font)',
    fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all .18s', whiteSpace: 'nowrap',
    opacity: loading ? 0.7 : 1,
  }
  const sizes = {
    sm: { padding: '6px 14px', fontSize: '12px' },
    md: { padding: '9px 20px', fontSize: '13px' },
    lg: { padding: '12px 28px', fontSize: '15px' },
  }
  const variants = {
    primary:  { background: 'var(--accent)', color: '#fff' },
    ghost:    { background: 'var(--surface3)', color: 'var(--text)', border: '1px solid var(--border)' },
    danger:   { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.25)' },
    success:  { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(61,214,140,0.25)' },
    outline:  { background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' },
  }
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant] }} className={className} {...props}>
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  )
}

/* ── Input ── */
export function Input({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>}
      <input
        style={{
          background: 'var(--surface2)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)',
          fontSize: '14px', outline: 'none', transition: 'border .2s', width: '100%',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

/* ── Textarea ── */
export function Textarea({ label, error, rows = 4, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>}
      <textarea
        rows={rows}
        style={{
          background: 'var(--surface2)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)',
          fontSize: '14px', outline: 'none', resize: 'vertical', transition: 'border .2s', width: '100%',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
        {...props}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

/* ── Select ── */
export function Select({ label, options = [], ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>}
      <select
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)',
          fontSize: '14px', outline: 'none', width: '100%',
        }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: 'var(--surface2)' }}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/* ── Card ── */
export function Card({ children, style = {}, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        transition: hover ? 'all .2s' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={hover ? e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)' } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' } : undefined}
    >
      {children}
    </div>
  )
}

/* ── Badge ── */
export function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'var(--blue-dim)', text: 'var(--blue)' },
    green:  { bg: 'var(--green-dim)', text: 'var(--green)' },
    red:    { bg: 'var(--red-dim)', text: 'var(--red)' },
    yellow: { bg: 'var(--yellow-dim)', text: 'var(--yellow)' },
    orange: { bg: 'var(--accent-dim)', text: 'var(--accent)' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600, display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

/* ── Spinner ── */
export function Spinner({ size = 18, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid rgba(255,255,255,0.1)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)', padding: '32px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeUp 0.25s ease',
      }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, color: 'var(--text2)', fontSize: 16 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/* ── Empty State ── */
export function Empty({ icon = '📭', title, description }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 13 }}>{description}</div>}
    </div>
  )
}

/* ── Tag chip ── */
export function Tag({ children, color = 'default' }) {
  const map = {
    default:  '#2a2d3a',
    blue:     'var(--blue-dim)',
    green:    'var(--green-dim)',
    red:      'var(--red-dim)',
    orange:   'var(--accent-dim)',
    yellow:   'var(--yellow-dim)',
  }
  const textMap = {
    default: 'var(--text2)', blue: 'var(--blue)', green: 'var(--green)',
    red: 'var(--red)', orange: 'var(--accent)', yellow: 'var(--yellow)',
  }
  return (
    <span style={{
      background: map[color], color: textMap[color],
      padding: '3px 10px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 500,
    }}>{children}</span>
  )
}
