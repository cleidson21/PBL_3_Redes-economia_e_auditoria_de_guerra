import { useEffect, useState } from "react";

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message, type } = customEvent.detail;
      const id = Date.now();
      
      setToasts((prev) => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`px-4 py-3 rounded-lg shadow-xl text-white font-semibold text-sm border flex items-center gap-2 animate-in slide-in-from-right-4 fade-in
            ${t.type === 'success' ? 'bg-emerald-900/90 border-emerald-500' : 
              t.type === 'error' ? 'bg-red-900/90 border-red-500' : 
              'bg-blue-900/90 border-blue-500'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
