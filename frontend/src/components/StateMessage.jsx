export default function StateMessage({ title, children, action, tone = 'neutral' }) {
  return (
    <div className={`state-message ${tone}`}>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Notice({ type = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="notice-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
