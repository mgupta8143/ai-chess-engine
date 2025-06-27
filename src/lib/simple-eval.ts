import { Chess } from 'chess.js';

type PieceValues = {
  [key: string]: number;
};

/**
 * Standard chess piece values for material evaluation
 */
const PIECE_VALUES: PieceValues = {
  p: 1,   // Pawn
  n: 3,   // Knight
  b: 3,   // Bishop
  r: 5,   // Rook
  q: 9,   // Queen
  k: 0,   // King (not counted in material eval)
};

/**
 * Evaluates the current board position based on material advantage only.
 * Positive values indicate an advantage for White, negative for Black.
 * 
 * @param game - The chess.js game instance to evaluate
 * @returns The evaluation score in pawns (e.g., +1.5 means White is up 1.5 pawns)
 */
export function evaluateBoard(game: Chess): number {
  // Check for game over conditions first
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -100 : 100; // Negative for checkmated side
  }
  
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
    return 0;
  }

  let materialScore = 0;
  const board = game.board();
  
  // Sum material values for all pieces
  for (const row of board) {
    for (const square of row) {
      if (square) {
        const value = PIECE_VALUES[square.type] || 0;
        materialScore += square.color === 'w' ? value : -value;
      }
    }
  }
  
  // Return score rounded to 1 decimal place for cleaner output
  return parseFloat(materialScore.toFixed(1));
}