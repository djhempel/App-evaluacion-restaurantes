export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center-screen" style={{ minHeight: '50vh' }}>
      <div className="spinner" />
      {label && <p className="muted">{label}</p>}
    </div>
  )
}
