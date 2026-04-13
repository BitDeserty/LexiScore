import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { DEFAULT_CLOCK_MINUTES } from '../config';

interface ChessClockControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: (minutes: number) => void;
}

export const ChessClockControls: React.FC<ChessClockControlsProps> = ({
  isRunning, onStart, onPause, onReset
}) => {
  const [minutes, setMinutes] = useState(DEFAULT_CLOCK_MINUTES.toString());

  const handleReset = () => {
    const parsed = parseInt(minutes, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onReset(parsed);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-stone-200 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
          <Clock size={20} />
        </div>
        <h3 className="font-bold text-stone-800">Chess Clock</h3>
      </div>
      
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-stone-500 uppercase">Minutes/Player</label>
          <input 
            type="number" 
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-16 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-center font-bold text-stone-800 focus:outline-none focus:border-amber-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button 
              onClick={onPause}
              className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95"
            >
              <Pause size={16} /> Pause
            </button>
          ) : (
            <button 
              onClick={onStart}
              className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95"
            >
              <Play size={16} /> Start
            </button>
          )}
          
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95"
          >
            <RotateCcw size={16} /> Set Time
          </button>
        </div>
      </div>
    </div>
  );
};
