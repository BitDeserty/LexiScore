
import React from 'react';
import { PlayerStats } from '../types';

interface StatsCardProps {
  name: string;
  stats: PlayerStats;
  isActive: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ name, stats, isActive }) => {
  return (
    <div className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-white border-stone-200 shadow-sm'}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-stone-800">{name}</h3>
        {isActive && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">Current Turn</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Total Score</p>
          <p className="text-2xl font-bold text-stone-900">{stats.totalScore}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Avg/Word</p>
          <p className="text-2xl font-bold text-stone-900">{stats.averagePoints.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">High Word</p>
          <p className="text-sm font-bold text-stone-900 truncate" title={stats.highestWord?.word || 'N/A'}>
            {stats.highestWord ? `${stats.highestWord.word} (${stats.highestWord.points})` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Words</p>
          <p className="text-2xl font-bold text-stone-900">{stats.wordCount}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
