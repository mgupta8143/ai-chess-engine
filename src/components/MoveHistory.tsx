"use client";

import { Move } from "chess.js";

interface MoveHistoryProps {
  history: Move[];
}

export default function MoveHistory({ history }: MoveHistoryProps) {
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([history[i], history[i + 1]]);
  }

  return (
    <div className="w-full h-full flex flex-col bg-primary p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Move History</h3>
      <div className="flex-grow overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="pb-2">You</th>
              <th className="pb-2">Opponent</th>
            </tr>
          </thead>
          <tbody className="font-mono">
        {movePairs.map(([whiteMove, blackMove], index) => (
              <tr key={index}>
                <td className="py-1 border-t border-background">
                  {`${index + 1}. ${whiteMove.san}`}
                </td>
                <td className="py-1 border-t border-background">
                  {blackMove?.san || ""}
                </td>
              </tr>
        ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
