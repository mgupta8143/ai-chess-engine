"use client";

import ChessboardComponent from "@/components/ChessboardComponent";
import GameControls from "@/components/GameControls";
import EvaluationBar from "@/components/EvaluationBar";
import MoveHistory from "@/components/MoveHistory";
import { useChessGame } from "@/hooks/useChessGame";

export default function Home() {
  const { 
    fen, 
    history, 
    evaluation, 
    isAIThinking, 
    gameOver,
    onDrop, 
    resetGame, 
    undoMove 
  } = useChessGame();

  return (
    <main className="min-h-screen w-full bg-background text-text flex flex-col items-center p-8">
      <div className="text-center mb-8 w-full">
        <h1 className="text-7xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-accent via-secondary to-accent">
          AI CHESS CHALLENGE
        </h1>
        <p className="text-3xl font-semibold text-text-secondary tracking-wide">
          {isAIThinking ? 'AI IS THINKING...' : 'CAN YOU OUTSMART THE AI?'}
        </p>
      </div>
      
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col items-center">
          <div className="relative">
            <ChessboardComponent 
              fen={fen} 
              onDrop={onDrop} 
              isDraggable={!isAIThinking && !gameOver}
              isAIThinking={isAIThinking}
              gameOver={gameOver}
            />
            
            <div className="w-full max-w-lg">
              <EvaluationBar evaluation={evaluation} />
              
              <GameControls 
                resetGame={resetGame}
                undoMove={undoMove}
                isDisabled={isAIThinking || gameOver}
              />
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-64 mt-4 lg:mt-0">
          <MoveHistory history={history} />
        </div>
      </div>
    </main>
  );
}
