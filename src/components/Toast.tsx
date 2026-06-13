import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)

  const show = useCallback((text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(null), 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
