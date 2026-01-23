import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import './Toast.css'

type ToastType = 'success' | 'error' | 'info' | 'win'

interface Toast {
    id: string
    message: string
    type: ToastType
    amount?: number
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, amount?: number) => void
    showWin: (amount: number) => void
    showError: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info', amount?: number) => {
        const id = Math.random().toString(36).slice(2)
        setToasts(prev => [...prev, { id, message, type, amount }])
    }, [])

    const showWin = useCallback((amount: number) => {
        showToast(`You won $${amount.toLocaleString()}!`, 'win', amount)
    }, [showToast])

    const showError = useCallback((message: string) => {
        showToast(message, 'error')
    }, [showToast])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast, showWin, showError }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), toast.type === 'win' ? 5000 : 3000)
        return () => clearTimeout(timer)
    }, [toast.id, toast.type, onRemove])

    return (
        <div className={`toast toast-${toast.type}`} onClick={() => onRemove(toast.id)}>
            <div className="toast-icon">
                {toast.type === 'success' && '✓'}
                {toast.type === 'error' && '✕'}
                {toast.type === 'info' && 'ℹ'}
                {toast.type === 'win' && '🎉'}
            </div>
            <div className="toast-content">
                <span className="toast-message">{toast.message}</span>
                {toast.type === 'win' && toast.amount && (
                    <div className="toast-amount">+${toast.amount.toLocaleString()}</div>
                )}
            </div>
        </div>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within ToastProvider')
    return context
}
