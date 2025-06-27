import { Chess } from 'chess.js';

export async function getAiMove(game: Chess): Promise<string | null> {
  if (game.isGameOver() || game.isDraw()) return null;

  try {
    const response = await fetch('/api/chess-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen: game.fen() }),
    });

    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    
    const { move } = await response.json();
    
    try {
      new Chess(game.fen()).move(move);
      return move;
    } catch {
      throw new Error('Invalid move from API');
    }
  } catch (error) {
    console.error('AI move error:', error);
    const moves = game.moves();
    return moves[Math.floor(Math.random() * moves.length)] || null;
  }
}

export { evaluateBoard } from './simple-eval';
