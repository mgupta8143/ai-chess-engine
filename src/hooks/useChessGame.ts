"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Chess, Move, Square } from "chess.js";
import { getAiMove } from '@/lib/chess-ai';
import { evaluateBoard } from '@/lib/simple-eval';

type GameStatus = 'idle' | 'player-turn' | 'ai-thinking' | 'game-over';
type GameResult = {
  winner: 'white' | 'black' | null;
  reason: string;
  message: string;
};

/**
 * Manages chess game state and moves
 */
export function useChessGame() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [evaluation, setEvaluation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState<GameStatus>('player-turn');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateGameState = useCallback(() => {
    if (!isMounted.current) return;
    
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
    
    // Update evaluation
    const evalScore = evaluateBoard(game);
    console.log('Calculated evaluation:', evalScore);
    setEvaluation(evalScore);
    
    // Check for game over
    if (game.isGameOver() || game.isDraw()) {
      setGameOver(true);
      setStatus('game-over');
      let reason: string;
      let winner: 'white' | 'black' | null = game.turn() === 'w' ? 'black' : 'white';
      
      if (game.isCheckmate()) {
        reason = 'checkmate';
      } else if (game.isStalemate()) {
        reason = 'stalemate';
        winner = null;
      } else if (game.isInsufficientMaterial()) {
        reason = 'insufficient-material';
        winner = null;
      } else if (game.isThreefoldRepetition()) {
        reason = 'threefold-repetition';
        winner = null;
      } else {
        reason = 'game-over';
      }
      
      setGameResult({
        winner,
        reason,
        message: getGameOverMessage(reason, winner)
      });
    } else if (game.turn() === 'b') {
      setStatus('ai-thinking');
    } else {
      setStatus('player-turn');
    }
  }, [game]);

  const getGameOverMessage = (reason: string, winner: 'white' | 'black' | null): string => {
    switch (reason) {
      case 'checkmate':
        return `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`;
      case 'stalemate':
        return 'Game drawn by stalemate';
      case 'insufficient-material':
        return 'Game drawn by insufficient material';
      case 'threefold-repetition':
        return 'Game drawn by threefold repetition';
      default:
        return 'Game over';
    }
  };

  const makeAIMove = useCallback(async () => {
    if (game.isGameOver() || game.isDraw()) {
      setStatus('game-over');
      return;
    }

    setStatus('ai-thinking');
    setError(null);
    
    try {
      const aiMove = await getAiMove(game);
      
      if (!isMounted.current) return;
      
      if (aiMove) {
        game.move(aiMove);
        updateGameState();
      }
    } catch (error) {
      console.error('AI move error:', error);
      setError('Failed to get AI move. Please try again.');
      setStatus('player-turn');
    }
  }, [game, updateGameState]);

  const onDrop = useCallback((source: Square, target: Square): boolean => {
    if (status !== 'player-turn') return false;

    try {
      const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
      });
      
      if (!move) return false;
      
      updateGameState();
      
      // If game continues, let AI make a move
      if (!game.isGameOver() && !game.isDraw()) {
        makeAIMove();
      }
      
      return true;
    } catch (error) {
      console.error(`Move error: ${source}->${target}`, error);
      setError('Invalid move');
      return false;
    }
  }, [game, status, updateGameState, makeAIMove]);

  const resetGame = useCallback(() => {
    game.reset();
    setGameOver(false);
    setError(null);
    updateGameState();
  }, [game, updateGameState]);

  const undoMove = useCallback(() => {
    if (status !== 'player-turn' || game.history().length < 2) return;
    
    try {
      game.undo(); // AI move
      game.undo(); // Player move
      updateGameState();
    } catch (error) {
      console.error('Error undoing move:', error);
      setError('Failed to undo move');
    }
  }, [game, status, updateGameState]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    fen,
    history,
    evaluation,
    isAIThinking: status === 'ai-thinking',
    gameOver,
    error,
    gameResult,
    onDrop,
    resetGame,
    undoMove
  };
}
