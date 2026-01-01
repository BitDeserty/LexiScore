
import React from 'react';
import { RotateCcw, UserPlus, Trophy } from 'lucide-react';
import { Player } from '../types';

interface HeaderProps {
  isGameStarted: boolean;
  onReset: () => void;
  onAddPlayer: () => void;
  maxPlayers: number;
  playerCount: number;
}

export const GameHeader: React.FC<HeaderProps> = ({ isGameStarted, onReset, onAddPlayer, maxPlayers, playerCount }) => (
  <header className="bg-[#0c1a26] text-white py-6 border-b-4 border-amber-500">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-amber-500/30 overflow-hidden flex items-center justify-center bg-stone-800">
          <img src="./bitdeserty_avatar_small.jpg" alt="Logo" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display='none')} />
          <Trophy className="text-amber-500 absolute" size={28} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight scrabble-font leading-none text-white drop-shadow-md">LexiScore</h1>
          <p className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mt-2">By BitDeserty Studios</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onReset} disabled={!isGameStarted} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all border font-semibold ${isGameStarted ? 'bg-[#1a2e40] hover:bg-[#253d54] text-stone-300 border-stone-700 active:scale-95' : 'bg-stone-800 text-stone-600 border-stone-700 cursor-not-allowed opacity-50'}`}>
          <RotateCcw size={18} /> <span className="hidden sm:inline">Reset Game</span>
        </button>
        <button disabled={isGameStarted || playerCount >= maxPlayers} onClick={onAddPlayer} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95 font-bold ${isGameStarted || playerCount >= maxPlayers ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-50' : 'bg-amber-600 hover:bg-amber-500 text-stone-900 shadow-xl shadow-amber-900/40 border-b-4 border-amber-800'}`}>
          <UserPlus size={18} /> <span className="hidden sm:inline">Add Player</span>
        </button>
      </div>
    </div>
  </header>
);

interface TurnBarProps {
  currentPlayerName: string;
  gameRound: number;
}

export const TurnStatusBar: React.FC<TurnBarProps> = ({ currentPlayerName, gameRound }) => (
  <div className="turn-indicator-sticky bg-[#0c1a26]/95 backdrop-blur-md border-b-8 border-amber-600 py-3">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-baseline gap-4">
        <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] hidden sm:block">Current Turn</span>
        <h2 className="text-2xl sm:text-4xl font-bold text-white scrabble-font">{currentPlayerName}</h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em] hidden sm:block">Active Round</span>
        <span className="text-2xl sm:text-3xl font-black text-amber-500/40 tabular-nums">#{gameRound.toString().padStart(2, '0')}</span>
      </div>
    </div>
  </div>
);
