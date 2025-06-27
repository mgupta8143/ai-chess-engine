"use client";

import { useCallback } from 'react';
import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";

interface ChessboardComponentProps {
  fen: string;
  onDrop: (sourceSquare: Square, targetSquare: Square) => boolean;
  isDraggable: boolean;
  isAIThinking: boolean;
  gameOver: boolean;
}

const CHESSBOARD_SIZE = 500;
const BOARD_STYLES = {
  borderRadius: '0.5rem',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  overflow: 'hidden',
};

const SQUARE_STYLES = {
  light: { backgroundColor: '#f0d9b5' },
  dark: { backgroundColor: '#b58863' },
};

export default function ChessboardComponent({ 
  fen, 
  onDrop, 
  isDraggable,
  isAIThinking,
  gameOver
}: ChessboardComponentProps) {
  const handlePieceDrag = useCallback(({ piece }: { piece: string }) => (
    isDraggable && piece.startsWith('w') && !isAIThinking && !gameOver
  ), [isDraggable, isAIThinking, gameOver]);

  const boardStyles = {
    ...BOARD_STYLES,
    opacity: isAIThinking || gameOver ? 0.7 : 1,
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: isAIThinking || gameOver ? 'none' : 'auto',
  };

  return (
    <div className="relative" style={{ width: CHESSBOARD_SIZE, height: CHESSBOARD_SIZE }}>
      <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        boardWidth={CHESSBOARD_SIZE}
        customBoardStyle={boardStyles}
        customLightSquareStyle={SQUARE_STYLES.light}
        customDarkSquareStyle={SQUARE_STYLES.dark}
        isDraggablePiece={handlePieceDrag}
      />
      
      {isAIThinking && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white px-4 py-2 rounded-lg text-black font-medium">
            AI is thinking...
          </div>
        </div>
      )}
      
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="bg-white p-4 rounded-lg text-center">
            <div className="text-xl font-bold mb-2">Game Over</div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
