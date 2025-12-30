
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
  AlertTriangle,
  Trash2,
  Zap,
  Type,
  Undo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Turn, PlayerStats, Play } from './types';
import StatsCard from './components/StatsCard';
import { defineWord } from './services/geminiService';
import { ENABLE_AI_INSIGHT } from './config';

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
  
  // Word Action State
  const [selectedPlayRef, setSelectedPlayRef] = useState<{ 
    playerId: string, 
    roundIdx: number, 
    playIdx: number,
    play: Play
  } | null>(null);
  const [isEditInputActive, setIsEditInputActive] = useState(false);
  const [editWordValue, setEditWordValue] = useState('');
  const [editPointsValue, setEditPointsValue] = useState('');

  // Name Editing State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const isGameStarted = useMemo(() => 
    players.some(p => p.turns.length > 0),
  [players]);

  // Helper to calculate score for any player
  const getPlayerStats = useCallback((player: Player): PlayerStats => {
    let totalScore = 0;
    let allPlays: Play[] = [];
    
    player.turns.forEach(turn => {
      if (turn) {
        turn.plays.forEach(play => {
          if (play.word !== '—' && !play.isRemoved) {
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

  // Leaderboard sorting logic
  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const statsA = getPlayerStats(a);
      const statsB = getPlayerStats(b);
      return statsB.totalScore - statsA.totalScore;
    });
  }, [players, getPlayerStats, gameRound]);

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

  const handlePlayClick = (playerId: string, roundIdx: number, playIdx: number, play: Play) => {
    if (play.word === '—' || play.isRemoved) return;
    setSelectedPlayRef({ playerId, roundIdx, playIdx, play });
    setEditWordValue(play.word);
    setEditPointsValue(play.points.toString());
    setIsEditInputActive(false);
  };

  const handleRemoveWord = () => {
    if (!selectedPlayRef) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;
    
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      
      // Instead of splicing, mark as removed to allow undo
      newPlays[playIdx] = { ...newPlays[playIdx], isRemoved: true };
      
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    }));
    setSelectedPlayRef(null);
  };

  const handleUndoRemove = (playerId: string, roundIdx: number, playIdx: number) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { ...newPlays[playIdx], isRemoved: false };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    }));
  };

  const handleEditWord = () => {
    if (!selectedPlayRef || !editWordValue.trim()) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;
    const newPoints = parseInt(editPointsValue) || 0;

    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { 
        ...newPlays[playIdx], 
        word: editWordValue.trim().toUpperCase(), 
        points: newPoints,
        isEdited: true 
      };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    }));
    setSelectedPlayRef(null);
  };

  const handleBingoWord = () => {
    if (!selectedPlayRef) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;

    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      
      // Toggle bingo
      const currentBingo = !!newPlays[playIdx].isBingo;
      newPlays[playIdx] = { 
        ...newPlays[playIdx], 
        points: currentBingo ? newPlays[playIdx].points - 50 : newPlays[playIdx].points + 50,
        isBingo: !currentBingo 
      };
      
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    }));
    setSelectedPlayRef(null);
  };

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
        // If current round was a "Skip" (---), replace it with the new word
        const filteredPlays = newTurns[roundIdx].plays.filter(p => p.word !== '—');
        newTurns[roundIdx] = {
          ...newTurns[roundIdx],
          plays: [...filteredPlays, newPlay]
        };
      } else {
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

  useEffect(() => {
    if (!ENABLE_AI_INSIGHT) return;
    
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
      {/* Word Management Modal */}
      <AnimatePresence>
        {selectedPlayRef && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/70 backdrop-blur-sm" 
              onClick={() => setSelectedPlayRef(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-amber-500 p-6 text-stone-900 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Word Options</h3>
                  <p className="text-3xl font-bold scrabble-font">{selectedPlayRef.play.word}</p>
                </div>
                <button onClick={() => setSelectedPlayRef(null)} className="p-2 hover:bg-amber-600 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {isEditInputActive ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Update Word</label>
                      <input 
                        type="text" 
                        value={editWordValue}
                        onChange={(e) => setEditWordValue(e.target.value.toUpperCase())}
                        className="w-full bg-stone-50 border-2 border-amber-400 rounded-xl px-4 py-3 text-xl font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Update Points</label>
                      <input 
                        type="number" 
                        value={editPointsValue}
                        onChange={(e) => setEditPointsValue(e.target.value)}
                        className="w-full bg-stone-50 border-2 border-amber-400 rounded-xl px-4 py-3 text-xl font-bold outline-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={handleEditWord} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95">Save Changes</button>
                      <button onClick={() => setIsEditInputActive(false)} className="flex-1 bg-stone-100 text-stone-500 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all">Back</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setIsEditInputActive(true)}
                      className="flex items-center gap-4 p-5 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 transition-all active:scale-95 text-left"
                    >
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Type size={24} />
                      </div>
                      <div>
                        <p className="font-black text-stone-800 uppercase text-xs tracking-wider">Edit Word</p>
                        <p className="text-sm text-stone-500">Correct spelling or point value</p>
                      </div>
                    </button>

                    <button 
                      onClick={handleBingoWord}
                      className={`flex items-center gap-4 p-5 rounded-2xl border transition-all active:scale-95 text-left ${selectedPlayRef.play.isBingo ? 'bg-amber-100 border-amber-300' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedPlayRef.play.isBingo ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                        <Zap size={24} />
                      </div>
                      <div>
                        <p className="font-black text-stone-800 uppercase text-xs tracking-wider">Bingo Word</p>
                        <p className="text-sm text-stone-500">
                          {selectedPlayRef.play.isBingo ? 'Remove 50pt bonus' : 'Add 50pt bonus'}
                        </p>
                      </div>
                    </button>

                    <button 
                      onClick={handleRemoveWord}
                      className="flex items-center gap-4 p-5 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-100 transition-all active:scale-95 text-left"
                    >
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                        <Trash2 size={24} />
                      </div>
                      <div>
                        <p className="font-black text-red-800 uppercase text-xs tracking-wider">Remove Word</p>
                        <p className="text-sm text-red-400">Mark word as removed</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <p className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mt-2 opacity-100">By BitDeserty Studios</p>
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
        
        {/* Left Column: Input & Animated Leaderboard */}
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
              {ENABLE_AI_INSIGHT && (definition || isLoadingDef) && (
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

          {/* Animated Leaderboard */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-stone-500 uppercase tracking-[0.3em] px-2">Leaderboard</h2>
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {rankedPlayers.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 1
                    }}
                  >
                    <StatsCard
                      name={p.name}
                      stats={getPlayerStats(p)}
                      isActive={p.id === currentPlayer.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
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
                      const roundTotal = turn ? turn.plays.reduce((sum, play) => play.isRemoved ? sum : sum + play.points, 0) : 0;
                      
                      return (
                        <td key={p.id} className={`px-8 py-5 border-l border-stone-50/50 ${playerIdx === currentPlayerIndex && roundIdx === gameRound - 1 ? 'bg-amber-100/20 ring-inset ring-2 ring-amber-500/20' : ''}`}>
                          {turn ? (
                            <div className="flex flex-col gap-2">
                              {turn.plays.map((play, playIdx) => {
                                if (play.isRemoved) {
                                  return (
                                    <button 
                                      key={playIdx}
                                      onClick={() => handleUndoRemove(p.id, roundIdx, playIdx)}
                                      className="flex items-center justify-between w-full text-left p-1 -m-1 rounded-lg bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all group/undo animate-in fade-in duration-300"
                                      title="Click to restore word"
                                    >
                                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter flex items-center gap-1.5 italic">
                                        <Trash2 size={10} className="opacity-50" /> Word Removed
                                      </span>
                                      <span className="text-[9px] font-black bg-stone-200 px-1.5 py-0.5 rounded text-stone-600 group-hover/undo:bg-amber-500 group-hover/undo:text-white transition-colors flex items-center gap-1">
                                        <Undo2 size={10} /> Undo
                                      </span>
                                    </button>
                                  );
                                }
                                
                                return (
                                  <button 
                                    key={playIdx} 
                                    onClick={() => handlePlayClick(p.id, roundIdx, playIdx, play)}
                                    className={`flex items-center justify-between w-full text-left p-1 -m-1 rounded-lg hover:bg-stone-100/80 transition-all group/play animate-in fade-in slide-in-from-left-2 duration-300 ${play.word === '—' ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                                  >
                                    <span className={`text-base leading-tight break-words max-w-[150px] uppercase tracking-wide transition-all ${
                                      play.word === '—' 
                                        ? 'text-stone-300 italic font-normal' 
                                        : play.isBingo 
                                          ? 'text-amber-700 font-black scale-105 origin-left' 
                                          : 'text-stone-800 font-bold'
                                    }`}>
                                      {play.word}{play.isEdited ? '*' : ''}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 border shadow-sm transition-all ${
                                      play.isBingo 
                                        ? 'bg-amber-600 text-white border-amber-500' 
                                        : 'bg-stone-100 text-stone-600 border-stone-200 group-hover/play:bg-stone-200'
                                    }`}>
                                      {play.points}
                                    </span>
                                  </button>
                                );
                              })}
                              
                              {turn.plays.filter(pl => !pl.isRemoved).length > 1 && (
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
                    const stats = getPlayerStats(p);
                    return (
                      <td key={p.id} className="px-8 py-8 text-4xl scrabble-font text-white drop-shadow-md">
                        {stats.totalScore}
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
