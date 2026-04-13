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
  timeoutSeconds: number;
  onTimeoutSecondsChange: (seconds: number) => void;
}

export const ChessClockControls: React.FC<ChessClockControlsProps> = ({
  isActive, onToggle, isRunning, onStart, onPause, onReset,
  timeoutSeconds, onTimeoutSecondsChange
}) => {
  const [minutes, setMinutes] = useState(DEFAULT_CLOCK_MINUTES.toString());
  const [lastAppliedMinutes, setLastAppliedMinutes] = useState(DEFAULT_CLOCK_MINUTES.toString());
  const [lastAppliedTimeout, setLastAppliedTimeout] = useState(timeoutSeconds);

  const handleReset = () => {
    const parsed = parseInt(minutes, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onReset(parsed);
      setLastAppliedMinutes(minutes);
      setLastAppliedTimeout(timeoutSeconds);
    }
  };

  const isTimeChanged = minutes !== lastAppliedMinutes || timeoutSeconds !== lastAppliedTimeout;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileTap={{ scale: 0.995, y: 1 }}
      className="rounded-3xl shadow-lg border flex items-center justify-between gap-4 overflow-hidden bg-[#0c1a26] border-amber-500/30 p-6 w-full"
    >
      <div className="flex items-center gap-8 flex-wrap">
        <div 
          onClick={onToggle}
          className="flex items-center gap-3 select-none group cursor-pointer"
        >
          <div className="p-2 rounded-xl transition-colors bg-amber-500 text-[#0c1a26]">
            <Clock size={20} />
          </div>
          <h3 className="font-bold transition-colors text-white text-lg">
            Game Clock
          </h3>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Time Pool/Player</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-16 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 text-center font-bold text-amber-500 focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-stone-500 font-bold">min</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Turn Reset</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  value={timeoutSeconds}
                  onChange={(e) => onTimeoutSecondsChange(parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 text-center font-bold text-emerald-500 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-stone-500 font-bold">sec</span>
              </div>
            </div>
          </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-3 min-w-[160px]"
      >
          {isRunning ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onPause(); }}
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0c1a26] px-8 py-4 rounded-full font-black text-lg transition-all active:scale-95 shadow-xl shadow-amber-900/40 w-full"
            >
              <Pause size={24} /> PAUSE
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#0c1a26] px-8 py-4 rounded-full font-black text-lg transition-all active:scale-95 shadow-xl shadow-emerald-900/40 w-full"
            >
              <Play size={24} /> START
            </button>
          )}
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border w-full text-xs ${
              isTimeChanged 
                ? 'bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30' 
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <RotateCcw size={14} /> {isTimeChanged ? "Apply & Reset" : "Set Time"}
          </button>
        </motion.div>
    </motion.div>
  );
};
