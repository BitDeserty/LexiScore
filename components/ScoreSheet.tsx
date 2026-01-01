
import React from 'react';
import { ClipboardList, Hash, Pencil, X, Plus, Trash2 } from 'lucide-react';
import { Player, Play, PlayerStats } from '../types';

interface ScoreSheetProps {
  players: Player[];
  currentPlayerIndex: number;
  gameRound: number;
  isGameStarted: boolean;
  editingPlayerId: string | null;
  editNameValue: string;
  onStartEditName: (p: Player) => void;
  onSaveName: () => void;
  onCancelEditName: () => void;
  onSetNameValue: (val: string) => void;
  onRemovePlayer: (id: string) => void;
  onUndoRemove: (pId: string, rIdx: number, pIdx: number) => void;
  onPlayClick: (e: React.MouseEvent, pId: string, rIdx: number, pIdx: number, play: Play) => void;
  onOpenAddWord: () => void;
  getPlayerStats: (p: Player) => PlayerStats;
  activeCellRef: React.RefObject<HTMLDivElement>;
  editInputRef: React.RefObject<HTMLInputElement>;
}

export const ScoreSheet: React.FC<ScoreSheetProps> = ({ 
  players, currentPlayerIndex, gameRound, isGameStarted, editingPlayerId, editNameValue,
  onStartEditName, onSaveName, onCancelEditName, onSetNameValue, onRemovePlayer,
  onUndoRemove, onPlayClick, onOpenAddWord, getPlayerStats, activeCellRef, editInputRef
}) => (
  <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col min-h-[600px]">
    <div className="bg-[#0c1a26] p-5 border-b border-amber-50/30 flex justify-between items-center">
      <h2 className="font-bold text-white flex items-center gap-3">
        <ClipboardList className="text-amber-500" size={24} /> Score Sheet
      </h2>
    </div>
    <div className="overflow-auto flex-grow custom-scrollbar flex flex-col">
      <table className="w-full text-left border-collapse min-w-[600px] h-full flex flex-col">
        <thead className="block bg-stone-50 border-b border-stone-200">
          <tr className="grid" style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
            <th className="px-4 py-5 text-center text-stone-400 border-r border-stone-100 flex items-center justify-center"><Hash size={16} className="opacity-40" /></th>
            {players.map((p, idx) => (
              <th key={p.id} className={`px-4 py-5 flex items-center ${idx === currentPlayerIndex ? 'bg-amber-50/50' : ''}`}>
                {editingPlayerId === p.id ? (
                  <input 
                    ref={editInputRef} 
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    type="text" 
                    value={editNameValue} 
                    onChange={(e) => onSetNameValue(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') onSaveName(); if (e.key === 'Escape') onCancelEditName(); }} 
                    onBlur={onSaveName} 
                    className="w-full bg-white border-2 border-amber-400 rounded-lg px-2 py-1 text-stone-800 font-bold outline-none" 
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 w-full group">
                    <span onClick={() => onStartEditName(p)} className={`font-black text-lg truncate cursor-pointer hover:text-amber-600 ${idx === currentPlayerIndex ? 'text-amber-700' : 'text-stone-800'}`}>{p.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onStartEditName(p)} className="text-stone-300 hover:text-amber-500 opacity-20 group-hover:opacity-100"><Pencil size={14} /></button>
                      {!isGameStarted && players.length > 1 && <button onClick={() => onRemovePlayer(p.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={16} /></button>}
                    </div>
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block flex-grow divide-y divide-stone-100">
          {Array.from({ length: gameRound }).map((_, roundIdx) => (
            <tr key={roundIdx} className={`grid ${roundIdx === gameRound - 1 ? 'bg-amber-50/10' : 'hover:bg-stone-50/50'}`} style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
              <td className="px-1 py-5 text-center border-r border-stone-100 bg-stone-50/30 flex items-center justify-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black text-stone-500 bg-stone-100 border border-stone-200">{roundIdx + 1}</span>
              </td>
              {players.map((p, playerIdx) => {
                const turn = p.turns[roundIdx];
                const isCurrentTurnCell = playerIdx === currentPlayerIndex && roundIdx === gameRound - 1;
                
                // Calculate subtotal for the turn if it exists
                const turnTotal = turn?.plays.reduce((sum, play) => play.isRemoved ? sum : sum + play.points, 0) || 0;
                const hasMultiplePlays = (turn?.plays.length || 0) > 1;

                return (
                  <td key={p.id} className={`px-4 py-5 border-l border-stone-50/50 relative flex flex-col justify-center ${isCurrentTurnCell ? 'bg-amber-100/20 ring-inset ring-2 ring-amber-500/20' : ''}`}>
                    {turn ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          {turn.plays.map((play, playIdx) => (
                            <button key={playIdx} onClick={(e) => onPlayClick(e, p.id, roundIdx, playIdx, play)} className={`flex items-center justify-between w-full text-left p-1.5 rounded-lg hover:bg-stone-100/80 transition-colors ${play.word === 'PASSED' || play.word === '—' ? 'cursor-default pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                              <span className={`text-sm uppercase tracking-wide ${play.word === '—' || play.word === 'PASSED' ? 'text-stone-400 italic' : play.isBingo ? 'text-amber-700 font-black underline decoration-amber-300' : 'text-stone-800 font-bold'}`}>{play.word}{play.isRemoved ? ' (RM)' : ''}</span>
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{play.points}</span>
                            </button>
                          ))}
                        </div>
                        
                        {/* Turn Subtotal Indicator */}
                        {hasMultiplePlays && (
                          <div className="mt-1 pt-1 border-t border-stone-100 flex justify-between items-center px-1.5">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter">Turn Total</span>
                            <span className="text-xs font-black text-stone-900 bg-amber-100/50 px-1.5 rounded">{turnTotal}</span>
                          </div>
                        )}
                      </div>
                    ) : isCurrentTurnCell ? (
                      <div ref={activeCellRef} className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <button onClick={onOpenAddWord} className="w-full py-3 border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center gap-1 text-amber-600 hover:bg-amber-50 group">
                          <Plus size={20} className="group-hover:rotate-90 transition-transform" /><span className="text-[10px] font-black uppercase">Add Words</span>
                        </button>
                      </div>
                    ) : <span className="text-stone-200 text-xl font-light opacity-50">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot className="block sticky bottom-0 bg-[#0c1a26] text-white font-bold border-t-4 border-amber-500 mt-auto z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
          <tr className="grid" style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
            <td className="px-4 py-8 border-r border-stone-700"></td>
            {players.map((p) => (
              <td key={p.id} className="px-4 py-8 text-4xl scrabble-font flex items-center justify-start drop-shadow-sm">{getPlayerStats(p).totalScore}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);
