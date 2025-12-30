
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  RotateCcw, 
  Send, 
  SkipForward, 
  Info, 
  Users, 
  Pencil, 
  Check, 
  X, 
  UserPlus, 
  Trophy, 
  Gamepad2, 
  ClipboardList,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { Player, Turn, PlayerStats, Play } from './types';
import StatsCard from './components/StatsCard';
import { defineWord } from './services/geminiService';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player 1', turns: [] },
    { id: '2', name: 'Player 2', turns: [] }
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameRound, setGameRound] = useState(1);
  const [wordInput, setWordInput] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [definition, setDefinition] = useState<string | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  // Name Editing State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const isGameStarted = useMemo(() => 
    players.some(p => p.turns.length > 0),
  [players]);

  const handleResetRequest = useCallback(() => {
    if (isGameStarted) {
      setIsResetModalOpen(true);
    }
  }, [isGameStarted]);

  const performReset = useCallback(() => {
    setPlayers(prev => prev.map(p => ({ ...p, turns: [] })));
    setCurrentPlayerIndex(0);
    setGameRound(1);
    setWordInput('');
    setPointsInput('');
    setDefinition(null);
    setEditingPlayerId(null);
    setIsResetModalOpen(false);
  }, []);

  const addPlayer = useCallback(() => {
    if (isGameStarted) return;
    const newId = Math.random().toString(36).substr(2, 9);
    setPlayers(prev => [...prev, { id: newId, name: `Player ${prev.length + 1}`, turns: [] }]);
  }, [players.length, isGameStarted]);

  const removePlayer = useCallback((id: string) => {
    if (isGameStarted || players.length <= 1) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
    setCurrentPlayerIndex(0);
  }, [isGameStarted, players.length]);

  const startEditingName = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditNameValue(player.name);
    // If the player we are editing isn't the current player, 
    // we should switch to them so the edit input appears in the sidebar
    const index = players.findIndex(p => p.id === player.id);
    if (index !== -1 && index !== currentPlayerIndex) {
      setCurrentPlayerIndex(index);
    }
  };

  const savePlayerName = () => {
    if (!editNameValue.trim() || !editingPlayerId) {
      setEditingPlayerId(null);
      return;
    }
    setPlayers(prev => prev.map(p => 
      p.id === editingPlayerId ? { ...p, name: editNameValue.trim() } : p
    ));
    setEditingPlayerId(null);
  };

  const cancelEditingName = () => {
    setEditingPlayerId(null);
  };

  // Automatically select text when editing starts
  useEffect(() => {
    if (editingPlayerId && editInputRef.current) {
      editInputRef.current.select();
    }
  }, [editingPlayerId]);

  const submitWord = useCallback(() => {
    const points = parseInt(pointsInput);
    if (!wordInput.trim() || isNaN(points)) return;

    const roundIdx = gameRound - 1;
    const newPlay: Play = { 
      word: wordInput.trim().toUpperCase(), 
      points 
    };

    setPlayers(prev => {
      const updated = [...prev];
      const player = { ...updated[currentPlayerIndex] };
      const newTurns = [...player.turns];
      
      if (newTurns[roundIdx]) {
        // Add to existing round
        newTurns[roundIdx] = {
          ...newTurns[roundIdx],
          plays: [...newTurns[roundIdx].plays, newPlay]
        };
      } else {
        // Start new round entry
        newTurns[roundIdx] = {
          plays: [newPlay],
          timestamp: Date.now()
        };
      }
      
      player.turns = newTurns;
      updated[currentPlayerIndex] = player;
      return updated;
    });

    setWordInput('');
    setPointsInput('');
    setDefinition(null);
  }, [wordInput, pointsInput, currentPlayerIndex, gameRound]);

  const endTurn = useCallback(() => {
    const roundIdx = gameRound - 1;
    
    setPlayers(prev => {
      // If player played nothing this round, mark as skipped
      if (prev[currentPlayerIndex].turns[roundIdx]) return prev;
      
      const updated = [...prev];
      const player = { ...updated[currentPlayerIndex] };
      const newTurns = [...player.turns];
      newTurns[roundIdx] = { 
        plays: [{ word: '—', points: 0 }], 
        timestamp: Date.now() 
      };
      player.turns = newTurns;
      updated[currentPlayerIndex] = player;
      return updated;
    });

    if (currentPlayerIndex === players.length - 1) {
      setGameRound(prev => prev + 1);
    }
    
    setCurrentPlayerIndex(prev => (prev + 1) % players.length);
    setWordInput('');
    setPointsInput('');
    setDefinition(null);
    setEditingPlayerId(null);
  }, [players.length, currentPlayerIndex, gameRound]);

  const getPlayerStats = useCallback((player: Player): PlayerStats => {
    let totalScore = 0;
    let allPlays: Play[] = [];
    
    player.turns.forEach(turn => {
      if (turn) {
        turn.plays.forEach(play => {
          if (play.word !== '—') {
            totalScore += play.points;
            allPlays.push(play);
          }
        });
      }
    });

    const wordCount = allPlays.length;
    const averagePoints = wordCount > 0 ? totalScore / wordCount : 0;
    const highestWord = allPlays.length > 0 
      ? [...allPlays].sort((a, b) => b.points - a.points)[0]
      : null;

    return { totalScore, averagePoints, highestWord, wordCount };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (wordInput.length >= 3) {
        setIsLoadingDef(true);
        const def = await defineWord(wordInput);
        setDefinition(def);
        setIsLoadingDef(false);
      } else {
        setDefinition(null);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [wordInput]);

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="min-h-screen bg-stone-100 pb-12">
      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsResetModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in fade-in duration-200 border-t-8 border-amber-500">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h3 className="text-3xl font-bold scrabble-font text-stone-900 mb-3">Reset Game?</h3>
              <p className="text-stone-500 leading-relaxed mb-8">
                Are you sure you want to clear all scores? This action will permanently erase the current game progress and cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-bold transition-all active:scale-95"
                >
                  No, Keep Playing
                </button>
                <button
                  onClick={performReset}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Yes, Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0c1a26] text-white shadow-2xl py-6 sticky top-0 z-50 border-b-4 border-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-amber-500/30 overflow-hidden flex items-center justify-center bg-stone-800">
              {!logoError ? (
                <img 
                  src="./bitdeserty_avatar_small.jpg" 
                  alt="BitDeserty Studios Logo" 
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Trophy className="text-amber-500" size={28} />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight scrabble-font leading-none text-white drop-shadow-md">LexiScore</h1>
              <p className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mt-2 opacity-100">BitDeserty Studios</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetRequest}
              disabled={!isGameStarted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all border font-semibold ${
                isGameStarted 
                ? 'bg-[#1a2e40] hover:bg-[#253d54] text-stone-300 border-stone-700 active:scale-95' 
                : 'bg-stone-800 text-stone-600 border-stone-700 cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw size={18} />
              <span className="hidden sm:inline">Reset Game</span>
            </button>
            <button
              disabled={isGameStarted}
              onClick={addPlayer}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95 font-bold ${
                isGameStarted 
                ? 'bg-stone-800 text-stone-600 cursor-not-allowed opacity-50' 
                : 'bg-amber-600 hover:bg-amber-500 text-stone-900 shadow-xl shadow-amber-900/40 border-b-4 border-amber-800'
              }`}
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Add Player</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Stats */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Player Status */}
          <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
            <div className="bg-amber-50 p-5 border-b border-amber-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <Users size={18} className="text-amber-600" />
                Current Turn
              </h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-200 px-3 py-1.5 rounded-lg shadow-sm">
                Round {gameRound}
              </span>
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center mb-8 min-h-[120px] justify-center">
                {editingPlayerId === currentPlayer.id ? (
                  <div className="w-full flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-200">
                    <input
                      ref={editInputRef}
                      autoFocus
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') savePlayerName();
                        if (e.key === 'Escape') cancelEditingName();
                      }}
                      className="w-full bg-stone-50 border-2 border-amber-400 rounded-2xl px-5 py-3 text-3xl font-bold text-center text-stone-900 focus:ring-4 focus:ring-amber-100 outline-none transition-all shadow-inner"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={savePlayerName} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md transition-all active:scale-95"
                      >
                        <Check size={20} /> Save
                      </button>
                      <button 
                        onClick={cancelEditingName} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-300 transition-all active:scale-95"
                      >
                        <X size={20} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-5xl font-bold text-stone-900 scrabble-font text-center drop-shadow-sm">
                      {currentPlayer?.name}
                    </p>
                    <button 
                      onClick={() => startEditingName(currentPlayer)}
                      className="mt-3 text-stone-400 hover:text-amber-600 flex items-center gap-1.5 text-sm font-bold transition-colors"
                    >
                      <Pencil size={14} />
                      EDIT NAME
                    </button>
                  </>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Played Word</label>
                  <input
                    type="text"
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && submitWord()}
                    placeholder="ENTER WORD..."
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-5 py-4 text-xl font-bold tracking-widest focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none shadow-inner"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Points</label>
                  <input
                    type="number"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitWord()}
                    placeholder="Points"
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-5 py-4 text-2xl font-bold focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button
                    onClick={submitWord}
                    disabled={!wordInput || !pointsInput}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 py-5 rounded-2xl font-black text-xl shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1"
                  >
                    <Send size={24} />
                    ADD WORD
                  </button>
                  
                  <button
                    onClick={endTurn}
                    className="w-full bg-[#0c1a26] hover:bg-[#1a2e40] text-amber-500 py-5 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-2 shadow-xl border-b-4 border-black active:border-b-0 active:translate-y-1"
                  >
                    <SkipForward size={24} />
                    END TURN
                  </button>
                </div>
              </div>

              {/* AI Insight */}
              {(definition || isLoadingDef) && (
                <div className="mt-8 p-5 bg-stone-50 rounded-2xl border border-amber-200/50 flex gap-4 animate-in slide-in-from-bottom-2 duration-500 shadow-sm">
                  <div className="bg-amber-100 p-2 rounded-lg h-fit shrink-0">
                    <Info className="text-amber-700" size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">AI Word Insight</h4>
                    {isLoadingDef ? (
                      <div className="flex gap-1.5 py-1">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    ) : (
                      <p className="text-sm text-stone-700 italic leading-relaxed">"{definition}"</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Quick Stats */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-stone-500 uppercase tracking-[0.3em] px-2">Leaderboard</h2>
            {players.map((p, idx) => (
              <StatsCard
                key={p.id}
                name={p.name}
                stats={getPlayerStats(p)}
                isActive={idx === currentPlayerIndex}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Score Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
          <div className="bg-[#0c1a26] p-5 border-b border-amber-500/30 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-3">
              <ClipboardList className="text-amber-500" size={24} />
              Score Sheet
            </h2>
          </div>
          
          <div className="overflow-x-auto flex-grow custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-8 py-5 text-xs font-black text-stone-400 uppercase tracking-[0.2em] w-20">
                    <Hash size={14} className="inline mr-1 opacity-50" />
                    Rd
                  </th>
                  {players.map((p, idx) => (
                    <th key={p.id} className={`px-8 py-5 relative group ${idx === currentPlayerIndex ? 'bg-amber-50/50' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className={`font-black text-lg tracking-tight truncate ${idx === currentPlayerIndex ? 'text-amber-700' : 'text-stone-800'}`}>
                            {p.name}
                          </span>
                          {!isGameStarted && (
                            <button 
                              onClick={() => startEditingName(p)}
                              title="Edit name"
                              className="text-stone-300 hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                        {!isGameStarted && players.length > 1 && (
                          <button 
                            onClick={() => removePlayer(p.id)}
                            title="Remove player"
                            className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {Array.from({ length: Math.max(gameRound, 1) }).map((_, roundIdx) => (
                  <tr key={roundIdx} className={`transition-all duration-300 ${roundIdx === gameRound - 1 ? 'bg-amber-50/10' : 'hover:bg-stone-50/50'}`}>
                    <td className="px-8 py-5 text-sm font-black text-stone-400">{roundIdx + 1}</td>
                    {players.map((p, playerIdx) => {
                      const turn = p.turns[roundIdx];
                      const roundTotal = turn ? turn.plays.reduce((sum, play) => sum + play.points, 0) : 0;
                      
                      return (
                        <td key={p.id} className={`px-8 py-5 border-l border-stone-50/50 ${playerIdx === currentPlayerIndex && roundIdx === gameRound - 1 ? 'bg-amber-100/20 ring-inset ring-2 ring-amber-500/20' : ''}`}>
                          {turn ? (
                            <div className="flex flex-col gap-2">
                              {turn.plays.map((play, playIdx) => (
                                <div key={playIdx} className="flex items-center justify-between gap-4 group/play animate-in fade-in slide-in-from-left-2 duration-300">
                                  <span className={`text-base font-bold leading-tight break-words max-w-[150px] uppercase tracking-wide ${play.word === '—' ? 'text-stone-300 italic font-normal' : 'text-stone-800'}`}>
                                    {play.word}
                                  </span>
                                  <span className="text-[10px] font-black bg-stone-100 px-2 py-0.5 rounded-lg text-stone-600 shrink-0 border border-stone-200 shadow-sm group-hover/play:bg-stone-200 transition-colors">
                                    {play.points}
                                  </span>
                                </div>
                              ))}
                              
                              {turn.plays.length > 1 && (
                                <div className="mt-1 pt-1 border-t border-amber-100 flex justify-end">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-md border border-amber-200">
                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">TOTAL</span>
                                    <span className="text-[11px] font-black text-amber-700">{roundTotal}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-200 text-xl font-light opacity-50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
                {!isGameStarted && gameRound === 1 && (
                  <tr>
                    <td colSpan={players.length + 1} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <div className="p-6 bg-stone-200 rounded-3xl mb-2">
                           <Gamepad2 size={64} className="text-stone-400" />
                        </div>
                        <p className="text-stone-500 font-bold tracking-wide italic">
                          No words played yet. Start by entering a word for {players[currentPlayerIndex].name}.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#0c1a26] text-white font-bold border-t-4 border-amber-500 shadow-[0_-8px_15px_rgba(0,0,0,0.3)]">
                <tr>
                  <td className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Total Score</td>
                  {players.map((p) => {
                    const grandTotal = p.turns.reduce((sum, turn) => 
                      sum + (turn?.plays.reduce((s, play) => s + play.points, 0) || 0), 0
                    );
                    return (
                      <td key={p.id} className="px-8 py-8 text-4xl scrabble-font text-white drop-shadow-md">
                        {grandTotal}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default App;
