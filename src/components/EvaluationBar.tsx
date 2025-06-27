"use client";

import { useMemo } from 'react';

interface EvaluationBarProps {
  evaluation: number;
  className?: string;
}

export default function EvaluationBar({ 
  evaluation, 
  className = '' 
}: EvaluationBarProps) {
  const { whitePercent, blackPercent, scoreText } = useMemo(() => {
    const evalClamped = Math.max(-10, Math.min(10, evaluation));
    const whitePercent = ((evalClamped + 10) / 20) * 100;
    const blackPercent = 100 - whitePercent;
    
    // Format evaluation score
    let scoreText = '';
    if (evaluation > 0) {
      scoreText = `+${evaluation.toFixed(1)}`;
    } else if (evaluation < 0) {
      scoreText = evaluation.toFixed(1);
    } else {
      scoreText = '0.0';
    }
    
    return { whitePercent, blackPercent, scoreText };
  }, [evaluation]);

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-sm font-medium text-gray-700">Black</span>
        <span className="text-sm font-mono font-bold px-2 py-0.5 bg-gray-100 rounded">
          {scoreText}
        </span>
        <span className="text-sm font-medium text-gray-700">White</span>
      </div>
      <div className="relative w-full h-4 rounded-full border border-gray-300 bg-gray-200 overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-gray-800 transition-all duration-300"
          style={{ width: `${blackPercent}%` }}
        />
        <div 
          className="absolute top-0 right-0 h-full bg-white transition-all duration-300"
          style={{ width: `${whitePercent}%` }}
        />
        <div 
          className="absolute top-0 left-1/2 h-full w-0.5 bg-gray-400" 
          style={{ transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}
