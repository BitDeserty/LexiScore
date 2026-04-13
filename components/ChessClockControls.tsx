import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { DEFAULT_CLOCK_MINUTES } from '../config';

interface ChessClockControlsProps {
  isActive: boolean;
  onToggle: () => void;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: (minutes: number) => void;
}

export const ChessClockControls: React.FC<ChessClockControlsProps> = ({
  isActive, onToggle, isRunning, onStart, onPause, onReset
}) => {
  const [minutes, setMinutes] = useState(DEFAULT_CLOCK_MINUTES.toString());

  const handleReset = () => {
    const parsed = parseInt(minutes, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onReset(parsed);
    }
  };

  return (
    <motion.div 
      layout
      whileTap={{ scale: 0.98, y: 2 }}
      className={`rounded-3xl shadow-lg border flex flex-wrap items-center justify-between gap-4 transition-all duration-500 overflow-hidden ${
        isActive 
          ? 'bg-[#0c1a26] border-amber-500/30 p-6 w-full' 
          : 'bg-white border-stone-200 p-3 w-fit cursor-pointer hover:bg-stone-50'
      }`}
      onClick={!isActive ? onToggle : undefined}
    >
      <div 
        onClick={isActive ? onToggle : undefined}
        className={`flex items-center gap-3 select-none group ${isActive ? 'cursor-pointer' : ''}`}
      >
        <div className={`p-2 rounded-xl transition-colors ${
          isActive ? 'bg-amber-500 text-[#0c1a26]' : 'bg-amber-100 text-amber-600'
        }`}>
          <Clock size={isActive ? 20 : 16} />
        </div>
        <h3 className={`font-bold transition-colors ${
          isActive ? 'text-white text-lg' : 'text-stone-800 text-sm'
        }`}>
          Game Clock
        </h3>
      </div>
      
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Mins/Player</label>
            <input 
              type="number" 
              min="1"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-16 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 text-center font-bold text-amber-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onPause(); }}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0c1a26] px-4 py-2 rounded-xl font-bold transition-colors active:scale-95 shadow-lg shadow-amber-900/40"
              >
                <Pause size={16} /> Pause
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0c1a26] px-4 py-2 rounded-xl font-bold transition-colors active:scale-95 shadow-lg shadow-emerald-900/40"
              >
                <Play size={16} /> Start
              </button>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95 border border-stone-700"
            >
              <RotateCcw size={16} /> Set Time
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
