"use client";

import { Undo2, RotateCcw } from "lucide-react";

interface GameControlsProps {
  undoMove: () => void;
  resetGame: () => void;
  isDisabled?: boolean;
}

const baseButtonStyle = "p-3 rounded-lg transition-colors flex items-center justify-center";

/**
 * Game control buttons for undo and reset
 */
export default function GameControls({ 
  undoMove, 
  resetGame, 
  isDisabled = false 
}: GameControlsProps) {
  const buttonStyle = `${baseButtonStyle} ${
    isDisabled 
      ? 'bg-primary/20 cursor-not-allowed' 
      : 'bg-primary/50 hover:bg-primary cursor-pointer'
  }`;

  const iconColor = isDisabled ? 'text-text/40' : 'text-text-secondary';

  return (
    <div className="flex items-center gap-4">
      <button 
        onClick={isDisabled ? undefined : undoMove} 
        title="Undo Move" 
        className={buttonStyle}
        disabled={isDisabled}
      >
        <Undo2 className={`h-6 w-6 ${iconColor}`} />
      </button>
      <button 
        onClick={isDisabled ? undefined : resetGame} 
        title="Reset Game" 
        className={buttonStyle}
        disabled={isDisabled}
      >
        <RotateCcw className={`h-6 w-6 ${iconColor}`} />
      </button>
    </div>
  );
}
