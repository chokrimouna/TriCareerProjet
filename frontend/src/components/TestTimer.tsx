import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TestTimerProps {
  initialMinutes: number;
  onTimeUp: () => void;
}

export const TestTimer: React.FC<TestTimerProps> = ({ initialMinutes, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isWarning = timeLeft <= 300; // 5 minutes left

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
      isWarning ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
    }`}>
      <Clock className="w-5 h-5" />
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};
