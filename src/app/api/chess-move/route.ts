import { NextResponse, type NextRequest } from 'next/server';
import { Chess } from 'chess.js';
import OpenAI from 'openai';

type AISettings = {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const COMPLEXITY_THRESHOLD = 30;

// Model selection based on position complexity
const selectModel = (moveCount: number): string => {
  return moveCount > 30 ? 'gpt-4' : 'gpt-3.5-turbo';
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
  const isOpening = game.history().length < 10;
  const isEndgame = game.history().length > 30;
  
  // Calculate material balance for better context
  const board = game.board();
  const material = {
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

  // Game phase specific instructions
  const phaseInstructions = isOpening 
    ? 'Focus on controlling the center and developing pieces. Consider standard opening principles.'
    : isEndgame
      ? 'Focus on king activation, pawn promotion, and opposition. Simplify to a winning endgame if possible.'
      : 'Focus on piece coordination, weak squares, and tactical opportunities. Consider pawn breaks and piece activity.';

  return {
    system: `You are Magnus Carlsen, the reigning World Chess Champion. 
    - You are playing as ${turn} in this position.
    - You must respond with ONLY a valid move in algebraic notation from: ${legalMoves.join(', ')}
    - Think carefully about the position and choose the strongest move.
    - Consider both tactical and strategic elements of the position.
    - If you see a forced mate or significant material gain, play it immediately.`,
    
    user: `[Game Context]
- Position: ${fen}
- Turn: ${turn}
- Game Phase: ${isOpening ? 'Opening' : isEndgame ? 'Endgame' : 'Middlegame'}
- Material Balance: ${JSON.stringify(material, null, 2)}

[Positional Evaluation]
1. King Safety: ${game.isCheck() ? 'King is in check!' : 'King is safe'}
2. Piece Activity: ${game.isCheckmate() ? 'Checkmate!' : game.isDraw() ? 'Draw position' : 'Game in progress'}
3. Pawn Structure: ${game.isStalemate() ? 'Stalemate' : 'Normal'}
4. Tactical Opportunities: ${game.isStalemate() ? 'No legal moves' : 'Evaluate tactics'}
5. Long-term Plans: ${phaseInstructions}

[Available Moves]
${legalMoves.join(', ')}

[Instructions]
1. Analyze the position carefully
2. Consider candidate moves
3. Evaluate each candidate
4. Choose the strongest move
5. Respond ONLY with the move in algebraic notation (e.g., e4, Nf3, O-O)

[Think step by step before responding]`
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

      const model = selectModel(legalMoves.length);
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
