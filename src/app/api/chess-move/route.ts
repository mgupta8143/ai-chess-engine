/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse, type NextRequest } from 'next/server';
import { Chess, Square, Color, PieceSymbol } from 'chess.js';
import OpenAI from 'openai';

// Helper functions for position evaluation
function evaluateKingSafety(game: Chess, color: 'w' | 'b'): string {
  const kingPiece = game.board().flat().find(sq => sq?.type === 'k' && sq.color === color);
  if (!kingPiece?.square) return 'King not found';
  
  const kingSquare = kingPiece.square;
  const isKingInCorner = ['a1', 'h1', 'a8', 'h8'].includes(kingSquare);
  const isKingInCenter = ['e4', 'e5', 'd4', 'd5'].includes(kingSquare);
  const pawnShield = kingPiece.color === 'w' 
    ? game.get(`${kingSquare[0]}${parseInt(kingSquare[1]) + 1}` as Square)?.type === 'p'
    : game.get(`${kingSquare[0]}${parseInt(kingSquare[1]) - 1}` as Square)?.type === 'p';
  
  return `King on ${kingSquare}, ${isKingInCorner ? 'castled' : isKingInCenter ? 'in center' : 'developing'}, ${pawnShield ? 'with pawn shield' : 'exposed'}`;
}

function evaluatePieceActivity(game: Chess, color: 'w' | 'b'): string {
  const pieces = game.board()
    .flat()
    .filter((sq): sq is { type: PieceSymbol; color: Color; square: Square } => 
      sq !== null && sq.color === color
    );
    
  const activePieces = pieces.filter(p => {
    const moves = game.moves({ square: p.square, verbose: true });
    return moves.length > 0;
  });
  
  const pieceCount = pieces.length;
  const activeCount = activePieces.length;
  const activity = pieceCount > 0 ? Math.round((activeCount / pieceCount) * 100) : 0;
  
  return `${activity}% of pieces active (${activeCount}/${pieceCount})`;
}

function evaluatePawnStructure(game: Chess, color: 'w' | 'b'): string {
  const pawns = game.board()
    .flat()
    .filter(sq => sq?.type === 'p' && sq.color === color)
    .filter(p => p !== null)
    .map(p => p.square);
    
  if (pawns.length === 0) return 'No pawns';
  
  const files = new Set(pawns.map(p => p[0]));
  const doubledPawns = pawns.length - files.size;
  const isolatedPawns = Array.from(files).filter(f => 
    !files.has(String.fromCharCode(f.charCodeAt(0) - 1)) && 
    !files.has(String.fromCharCode(f.charCodeAt(0) + 1))
  ).length;
  
  return `${pawns.length} pawns, ${doubledPawns} doubled, ${isolatedPawns} isolated`;
}

function evaluateOpenFiles(game: Chess): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const openFiles = files.filter(file => {
    return !game.board().some(rank => 
      rank?.some(sq => sq?.type === 'p' && sq.square.startsWith(file))
    );
  });
  
  return openFiles.length > 0 ? openFiles.join(', ') : 'No open files';
}

function identifyWeakSquares(game: Chess, color: 'w' | 'b'): string {
  // Simple implementation - looks for weak squares in front of pawns
  const opponent = color === 'w' ? 'b' : 'w';
  const weakSquares: string[] = [];
  
  game.board().forEach((rank, rankIdx) => {
    rank.forEach((square, fileIdx) => {
      if (!square) {
        const squareName = String.fromCharCode(97 + fileIdx) + (8 - rankIdx);
        // Check if square is in front of opponent's pawn
        const inFront = game.get(squareName as Square);
        if (inFront?.type === 'p' && inFront.color === opponent) {
          weakSquares.push(squareName);
        }
      }
    });
  });
  
  return weakSquares.length > 0 ? weakSquares.join(', ') : 'No obvious weak squares';
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Model selection based on position complexity
const selectModel = (): string => {
  return 'gpt-4'
};

// AI generation settings
const getAISettings = () => ({
  temperature: 0.4,  // Lower for more deterministic moves
  max_tokens: 10,    // We only need a move in algebraic notation
  top_p: 0.9,        // Controls diversity
  frequency_penalty: 0.5,  // Slightly reduce repetition
  presence_penalty: 0.5,   // Slightly increase creativity
});

const createChessGame = (fen: string) => {
  const game = new Chess(fen);
  if (game.isGameOver() || game.isDraw()) {
    throw new Error('Game is already over');
  }
  return game;
};

const getChessPrompt = (fen: string, legalMoves: string[]) => {
  const game = new Chess(fen);
  const turn = game.turn().toUpperCase();
  const moveHistory = game.history({ verbose: true });
  const isOpening = moveHistory.length < 10;
  const isEndgame = moveHistory.length > 30;
  
  // Define material type for better type safety
  type MaterialCount = {
    pawn: number;
    knight: number;
    bishop: number;
    rook: number;
    queen: number;
  };

  type Material = {
    white: MaterialCount;
    black: MaterialCount;
  };

  // Calculate material balance and piece counts
  const board = game.board();
  const material: Material = {
    white: {
      pawn: board.flat().filter(p => p?.color === 'w' && p.type === 'p').length,
      knight: board.flat().filter(p => p?.color === 'w' && p.type === 'n').length,
      bishop: board.flat().filter(p => p?.color === 'w' && p.type === 'b').length,
      rook: board.flat().filter(p => p?.color === 'w' && p.type === 'r').length,
      queen: board.flat().filter(p => p?.color === 'w' && p.type === 'q').length
    },
    black: {
      pawn: board.flat().filter(p => p?.color === 'b' && p.type === 'p').length,
      knight: board.flat().filter(p => p?.color === 'b' && p.type === 'n').length,
      bishop: board.flat().filter(p => p?.color === 'b' && p.type === 'b').length,
      rook: board.flat().filter(p => p?.color === 'b' && p.type === 'r').length,
      queen: board.flat().filter(p => p?.color === 'b' && p.type === 'q').length
    }
  };

  // Helper function to get material for a specific color
  const getMaterialForColor = (color: 'white' | 'black') => material[color];

  // Game phase specific instructions
  const phaseInstructions = isOpening 
    ? 'Focus on controlling the center (e4, e5, d4, d5), developing minor pieces (knights before bishops), and castling early. Avoid moving the same piece multiple times in the opening.'
    : isEndgame
      ? 'Activate your king, create passed pawns, and use the opposition. Calculate concrete variations carefully. Remember: king activity is crucial in endgames.'
      : 'Look for tactical opportunities (forks, pins, skewers). Improve your worst placed piece. Control open files and strong squares. Consider pawn breaks.';

  // Get the board visualization and recent moves
  const boardVisualization = game.ascii();
  const lastMove = moveHistory[moveHistory.length - 1];
  const recentMoves = moveHistory.slice(-6).map((move, i) => 
    `${moveHistory.length - 5 + i}. ${move.color === 'w' ? '..' : ''}${move.san} (${move.from}→${move.to})`
  ).join('\n');

  // Identify immediate threats and tactical opportunities
  const currentColor = turn.toLowerCase() as 'w' | 'b';
  const opponentColor = currentColor === 'w' ? 'b' : 'w';
  
  const isInCheck = game.isCheck();
  const allMoves = game.moves({ verbose: true });
  
  // Find all pieces that are under attack and can be captured
  const hangingPieces = allMoves
    .filter(move => move.captured && move.color === opponentColor)
    .map(move => {
      // Ensure captured is defined before using it
      const capturedPiece = move.captured;
      if (!capturedPiece) return null;
      
      return {
        piece: move.piece.toUpperCase(),
        from: move.from,
        to: move.to,
        captured: capturedPiece,
        value: getPieceValue(capturedPiece),
        defended: isSquareDefended(game, move.to, currentColor)
      };
    })
    .filter((move): move is NonNullable<typeof move> => move !== null);

  // Sort by most valuable hanging pieces first
  hangingPieces.sort((a, b) => b.value - a.value);
  
  // Format hanging pieces info
  const hangingPiecesInfo = hangingPieces
    .map(p => `${p.piece} on ${p.to} (value: ${p.value}${p.defended ? ', but defended' : ''})`)
    .join('\n');

  // Find opponent threats (checks and captures)
  const opponentThreats = allMoves
    .filter(move => (move.captured || move.san.includes('+')) && move.color === opponentColor)
    .map(move => move.captured 
      ? `${move.piece.toUpperCase()}${move.from} takes ${move.captured} on ${move.to}` 
      : `${move.piece.toUpperCase()}${move.from} gives check to ${move.to}`);

  // Find our threats (checks and captures)
  const ourThreats = allMoves
    .filter(move => (move.captured || move.san.includes('+')) && move.color === currentColor)
    .map(move => move.captured 
      ? `${move.piece.toUpperCase()}${move.from} takes ${move.captured} on ${move.to}` 
      : `${move.piece.toUpperCase()}${move.from} gives check to ${move.to}`);
  
  // Helper function to get piece value
  function getPieceValue(piece: string): number {
    const values: {[key: string]: number} = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
    };
    return values[piece] || 0;
  }
  
  // Helper function to check if a square is defended
  function isSquareDefended(game: Chess, square: string, byColor: 'w' | 'b'): boolean {
    // Make a copy of the game to test moves
    const tempGame = new Chess(game.fen());
    // Try to find any piece of the given color that can move to this square
    return tempGame.moves({verbose: true}).some(move => 
      move.to === square && move.color === byColor
    );
  }

  return {
    system: `You are Magnus Carlsen, the World Chess Champion. You are playing as ${turn} in this game. 

CHESS PRINCIPLES TO FOLLOW:
1. Safety First: Always check for hanging pieces before making a move. Defend your pieces and attack undefended enemy pieces.
2. Material: ${material.white.queen + material.black.queen === 0 ? 'Endgame - focus on king activity and pawn promotion' : 'Middlegame - look for tactical opportunities'}
3. Development: Ensure all your pieces are developed and your king is safe
4. King Safety: ${evaluateKingSafety(game, currentColor)}
5. Pawn Structure: ${evaluatePawnStructure(game, currentColor)}
6. Piece Activity: ${evaluatePieceActivity(game, currentColor)}

IMPORTANT: Before making any move, check:
- Are any of your pieces under attack? If yes, move or defend them.
- Can you capture any undefended enemy pieces?
- Will your move leave any of your pieces undefended?
- Can your opponent capture any of your pieces after your move?

THINKING PROCESS:
1. First, evaluate the position:
   - Material count (you ${getMaterialForColor(currentColor === 'w' ? 'white' : 'black').queen}Q ${getMaterialForColor(currentColor === 'w' ? 'white' : 'black').rook}R ${getMaterialForColor(currentColor === 'w' ? 'white' : 'black').bishop}B ${getMaterialForColor(currentColor === 'w' ? 'white' : 'black').knight}N ${getMaterialForColor(currentColor === 'w' ? 'white' : 'black').pawn}P vs opponent ${getMaterialForColor(opponentColor === 'w' ? 'white' : 'black').queen}Q ${getMaterialForColor(opponentColor === 'w' ? 'white' : 'black').rook}R ${getMaterialForColor(opponentColor === 'w' ? 'white' : 'black').bishop}B ${getMaterialForColor(opponentColor === 'w' ? 'white' : 'black').knight}N ${getMaterialForColor(opponentColor === 'w' ? 'white' : 'black').pawn}P)
   - King safety for both sides
   - Piece activity and coordination
   - Pawn structure and weak squares
   - Open files and diagonals

2. Calculate forcing moves first:
   - Checks: ${game.moves({ verbose: true }).filter(m => m.san.includes('+')).map(m => m.san).join(', ') || 'No checks available'}
   - Captures: ${game.moves({ verbose: true }).filter(m => m.captured).map(m => m.san).join(', ') || 'No captures available'}
   - Threats: ${ourThreats.length > 0 ? ourThreats.join(', ') : 'No immediate threats'}

3. Consider these candidate moves (from legal moves): ${legalMoves.slice(0, 5).join(', ')}${legalMoves.length > 5 ? ` and ${legalMoves.length - 5} more` : ''}

4. Analyze your opponent's best response to each candidate move

5. Choose the move that improves your position the most while considering your opponent's best reply

6. Before finalizing, check for:
   - Hanging pieces
   - Tactical shots (forks, pins, skewers)
   - King safety
   - Pawn breaks

7. Format your response with ONLY the move in algebraic notation (e.g., "e4", "Nf3", "O-O")`,
    
    user: `[POSITION AFTER ${moveHistory.length} MOVES]
${boardVisualization}

[GAME CONTEXT]
- Turn: ${turn} to move
- Phase: ${isOpening ? 'Opening' : isEndgame ? 'Endgame' : 'Middlegame'}
- Check: ${isInCheck ? 'YES - You are in check! Must get out of check.' : 'No'}
- Last move: ${lastMove ? `${lastMove.color === 'w' ? 'White' : 'Black'} played ${lastMove.san} (${lastMove.piece.toUpperCase()} ${lastMove.from}→${lastMove.to})` : 'Game start'}
- Recent moves:\n${recentMoves || 'No moves yet'}

[MATERIAL COUNT]
- White: ${material.white.queen}Q ${material.white.rook}R ${material.white.bishop}B ${material.white.knight}N ${material.white.pawn}P
- Black: ${material.black.queen}Q ${material.black.rook}R ${material.black.bishop}B ${material.black.knight}N ${material.black.pawn}P

[POSITIONAL FACTORS]
1. King Safety: ${evaluateKingSafety(game, currentColor)}
2. Piece Activity: ${evaluatePieceActivity(game, currentColor)}
3. Pawn Structure: ${evaluatePawnStructure(game, currentColor)}
4. Open Files: ${evaluateOpenFiles(game)}
5. Weak Squares: ${identifyWeakSquares(game, currentColor)}

[IMMEDIATE CONSIDERATIONS]
${isInCheck ? '• ⚠️ YOU ARE IN CHECK! You must get out of check.\n' : ''}${hangingPieces.length > 0 ? `• ⚠️ HANGING PIECES (save yours, capture opponent's):\n${hangingPiecesInfo}\n` : ''}${opponentThreats.length > 0 ? `• Opponent threats: ${opponentThreats.join(', ')}\n` : ''}${ourThreats.length > 0 ? `• Your threats: ${ourThreats.join(', ')}\n` : ''}• ${phaseInstructions}

[LEGAL MOVES]
${legalMoves.length > 30 ? legalMoves.slice(0, 30).join(', ') + `... and ${legalMoves.length - 30} more` : legalMoves.join(', ')}

[YOUR MOVE]`
  };
};

const validateMove = (fen: string, move: string, legalMoves: string[]): string => {
  try {
    new Chess(fen).move(move);
    return move;
  } catch {
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    console.warn(`Invalid move from AI: ${move}. Falling back to random move: ${randomMove}`);
    return randomMove;
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('Received request to /api/chess-move');
    
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { fen } = requestBody;
    if (!fen) {
      const error = 'FEN string is required';
      console.error(error);
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    console.log('Processing FEN:', fen);
    
    try {
      const game = createChessGame(fen);
      const legalMoves = game.moves();
      console.log(`Found ${legalMoves.length} legal moves`);
      
      // Check game status
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        return NextResponse.json({
          error: `Checkmate! ${winner} wins!`,
          gameOver: true,
          winner,
          reason: 'checkmate'
        }, { status: 200 });
      }
      
      if (game.isDraw()) {
        let reason = 'draw';
        if (game.isStalemate()) reason = 'stalemate';
        else if (game.isThreefoldRepetition()) reason = 'threefold repetition';
        else if (game.isInsufficientMaterial()) reason = 'insufficient material';
        
        return NextResponse.json({
          error: 'Game drawn',
          gameOver: true,
          winner: null,
          reason
        }, { status: 200 });
      }
      
      if (game.isGameOver()) {
        return NextResponse.json({
          error: 'Game over',
          gameOver: true,
          winner: null,
          reason: 'unknown'
        }, { status: 200 });
      }

      const model = selectModel();
      const settings = getAISettings();
      console.log('Using AI model:', model);
      
      const { system, user } = getChessPrompt(fen, legalMoves);
      
      console.log('Sending request to OpenAI...');
      
      let completion;
      try {
        console.log('AI Settings:', JSON.stringify(settings, null, 2));
        
        completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          top_p: settings.top_p,
          frequency_penalty: settings.frequency_penalty,
          presence_penalty: settings.presence_penalty,
        });
      } catch (apiError: any) {
        console.error('OpenAI API Error:', apiError);
        
        // If rate limited or insufficient quota, try with a cheaper model
        if (apiError.code === 'insufficient_quota' || apiError.status === 429) {
          console.log('Rate limited or out of quota, falling back to random move');
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          return NextResponse.json({ 
            move: randomMove,
            warning: 'Using random move due to API limits',
            originalError: apiError.message
          });
        }
        
        // Re-throw if it's a different type of error
        throw apiError;
      }

      const move = completion.choices[0]?.message?.content?.trim();
      console.log('Received move from AI:', move);
      
      if (!move) {
        throw new Error('No move returned from AI');
      }

      const validatedMove = validateMove(fen, move, legalMoves);
      console.log('Validated move:', validatedMove);
      
      // Check game status after move
      const gameAfterMove = createChessGame(fen);
      gameAfterMove.move(validatedMove);
      
      const response: any = { 
        move: validatedMove,
        turn: gameAfterMove.turn() === 'w' ? 'white' : 'black',
        inCheck: gameAfterMove.isCheck(),
        gameOver: false
      };
      
      if (gameAfterMove.isCheck()) {
        response.message = `Check! ${response.turn === 'white' ? 'White' : 'Black'} is in check.`;
      }
      
      return NextResponse.json(response);
      
    } catch (gameError) {
      console.error('Game processing error:', gameError);
      throw gameError;
    }

  } catch (error) {
    console.error('Error in /api/chess-move:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get AI move';
    const statusCode = errorMessage.toLowerCase().includes('already over') || 
                     errorMessage.toLowerCase().includes('invalid fen') ? 400 : 500;
    
    const response: any = { 
      error: errorMessage,
      gameOver: errorMessage.includes('Game over') || errorMessage.includes('Checkmate') || errorMessage.includes('drawn')
    };
    
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      response.stack = error.stack;
    }
    
    return NextResponse.json(
      response,
      { 
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
