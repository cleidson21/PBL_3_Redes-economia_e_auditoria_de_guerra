import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownProps {
  deadline: number; // unix timestamp
  onZero: () => void;
  status: string;
}

export function Countdown({ deadline, onZero, status }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (status !== "PENDENTE") {
      setTimeLeft(0);
      return;
    }

    const calcTime = () => {
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, deadline - now);
    };

    setTimeLeft(calcTime());

    const interval = setInterval(() => {
      const remaining = calcTime();
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onZero();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, status, onZero]);

  if (status !== "PENDENTE") return <span className="text-slate-500">-</span>;

  const isExpired = timeLeft === 0;

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const ss = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm ${isExpired ? 'text-red-500' : 'text-slate-300'}`}>
      {isExpired ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      {mm}:{ss}
    </div>
  );
}
