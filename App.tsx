
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
  Undo2,
  Plus,
  Loader2,
  Search,
  Beaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Turn, PlayerStats, Play } from './types';
import StatsCard from './components/StatsCard';
import TestModal from './components/TestModal';
import { defineWord } from './services/geminiService';
import { runRegressionSuite, TestResult } from './services/testRunner';
import { WORD_CHECKER } from './config';

const STORAGE_KEY = 'lexiscore_game_state_v1';
const MAX_PLAYERS = 4;

// Confetti particle component
const ConfettiParticle: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 5 + Math.random() * 10;
  const tx = Math.cos(angle) * velocity * 15;
  const ty = Math.sin(angle) * velocity * 15;
  const rotation = Math.random() * 360;

  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      initial={{ x, y, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ 
        x: x + tx, 
        y: y + ty + 200, 
        opacity: 0,
        scale: 0.5,
        rotate: rotation + 720
      }}
      transition={{ 
        duration: 2 + Math.random() * 1.5,
        ease: "easeOut"
      }}
      className="fixed z-[200] pointer-events-none"
      style={{
        width: Math.random() * 8 + 4,
        height: Math.random() * 8 + 4,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px'
      }}
    />
  );
};

const App: React.FC = () => {
  // Load initial state from local storage if available
  const getInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved game state", e);
      }
    }
    return null;
  };

  const initialState = getInitialState();

  const [players, setPlayers] = useState<Player[]>(
    initialState?.players || [
      { id: '1', name: 'Player 1', turns: [] },
      { id: '2', name: 'Player 2', turns: [] }
    ]
  );
  
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>(
    initialState?.players || [...players]
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    initialState?.currentPlayerIndex ?? 0
  );

  const [gameRound, setGameRound] = useState(
    initialState?.gameRound ?? 1
  );

  const [wordInput, setWordInput] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [definition, setDefinition] = useState<string | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [logoError, setLogoError] = useState(false);
  
  // Local word list states
  const [wordList, setWordList] = useState<Set<string>>(new Set());
  const [wordListStatus, setWordListStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  
  const standingsRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const prevRankedIdsRef = useRef<string[]>([]);

  const [selectedPlayRef, setSelectedPlayRef] = useState<{ 
    playerId: string, 
    roundIdx: number, 
    playIdx: number,
    play: Play
  } | null>(null);
  const [clickCoords, setClickCoords] = useState<{ x: number, y: number } | null>(null);
  const [isEditInputActive, setIsEditInputActive] = useState(false);
  const [editWordValue, setEditWordValue] = useState('');
  const [editPointsValue, setEditPointsValue] = useState('');
  const [confetti, setConfetti] = useState<{ x: number, y: number, id: number } | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const MotionDiv = motion.div as any;

  // Persist state to local storage on change
  useEffect(() => {
    const stateToSave = {
      players,
      currentPlayerIndex,
      gameRound
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [players, currentPlayerIndex, gameRound]);

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

  const handleRunDiagnostics = () => {
    const results = runRegressionSuite(getPlayerStats);
    setTestResults(results);
    setIsTestModalOpen(true);
  };

  const rankedPlayers = useMemo(() => {
    return [...displayPlayers].sort((a, b) => {
      const statsA = getPlayerStats(a);
      const statsB = getPlayerStats(b);
      return statsB.totalScore - statsA.totalScore;
    });
  }, [displayPlayers, getPlayerStats]);

  // Handle automatic centering and leaderboard focus
  useEffect(() => {
    const currentRankedIds = rankedPlayers.map(p => p.id);
    const hasRankChanged = prevRankedIdsRef.current.length > 0 && 
                           JSON.stringify(prevRankedIdsRef.current) !== JSON.stringify(currentRankedIds);
    
    if (hasRankChanged && standingsRef.current) {
      // If the leaderboard changed, scroll to it. 
      standingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (activeCellRef.current) {
      // Otherwise, center the next "Add Words" cell
      activeCellRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center', 
        inline: 'center' 
      });
    }

    prevRankedIdsRef.current = currentRankedIds;
  }, [currentPlayerIndex, gameRound, rankedPlayers]);

  // Load enable1.txt on init
  useEffect(() => {
    if (WORD_CHECKER === 'LOCAL') {
      setWordListStatus('loading');
      fetch('enable1.txt')
        .then(async response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} at ${response.url}`);
          }
          const text = await response.text();
          const words = text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0);
          setWordList(new Set(words));
          setWordListStatus('loaded');
        })
        .catch(err => {
          console.error("Failed to load local word list.", err);
          setWordListStatus('error');
        });
    }
  }, []);

  // Unified legality status computed property
  const legalityStatus = useMemo(() => {
    const trimmedInput = wordInput.trim().toUpperCase();
    if (trimmedInput.length < 2) return 'none';

    if (WORD_CHECKER === 'LOCAL') {
      if (wordListStatus === 'loading') return 'loading';
      return wordList.has(trimmedInput) ? 'legal' : 'illegal';
    }

    if (WORD_CHECKER === 'AI') {
      if (isLoadingDef) return 'loading';
      if (!definition) return 'none';
      const aiVerdict = definition.trim().toUpperCase();
      if (aiVerdict.startsWith('VALID')) return 'legal';
      if (aiVerdict.startsWith('INVALID')) return 'illegal';
    }

    return 'none';
  }, [wordInput, wordList, wordListStatus, isLoadingDef, definition]);

  const isGameStarted = useMemo(() => 
    players.some(p => p.turns.length > 0),
  [players]);

  const handleResetRequest = useCallback(() => {
    if (isGameStarted) {
      setIsResetModalOpen(true);
    }
  }, [isGameStarted]);

  const performReset = useCallback(() => {
    const freshPlayers = players.map(p => ({ ...p, turns: [] }));
    setPlayers(freshPlayers);
    setDisplayPlayers([...freshPlayers]);
    setCurrentPlayerIndex(0);
    setGameRound(1);
    setWordInput('');
    setPointsInput('');
    setDefinition(null);
    setEditingPlayerId(null);
    setIsResetModalOpen(false);
    setIsInputModalOpen(false);
    prevRankedIdsRef.current = [];
  }, [players]);

  const addPlayer = useCallback(() => {
    if (isGameStarted || players.length >= MAX_PLAYERS) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newPlayer = { id: newId, name: `Player ${players.length + 1}`, turns: [] };
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    setDisplayPlayers([...updatedPlayers]);
  }, [players, isGameStarted]);

  const removePlayer = useCallback((id: string) => {
    if (isGameStarted || players.length <= 1) return;
    const updatedPlayers = players.filter(p => p.id !== id);
    setPlayers(updatedPlayers);
    setDisplayPlayers([...updatedPlayers]);
    setCurrentPlayerIndex(0);
  }, [isGameStarted, players]);

  const startEditingName = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditNameValue(player.name);
  };

  const savePlayerName = () => {
    if (!editingPlayerId) return;
    const trimmed = editNameValue.trim();
    if (trimmed) {
      const updated = players.map(p => 
        p.id === editingPlayerId ? { ...p, name: trimmed } : p
      );
      setPlayers(updated);
      setDisplayPlayers([...updated]);
    }
    setEditingPlayerId(null);
  };

  const cancelEditingName = () => {
    setEditingPlayerId(null);
  };

  const handlePlayClick = (e: React.MouseEvent, playerId: string, roundIdx: number, playIdx: number, play: Play) => {
    if (play.word === '—' || play.isRemoved) return;
    setClickCoords({ x: e.clientX, y: e.clientY });
    setSelectedPlayRef({ playerId, roundIdx, playIdx, play });
    setEditWordValue(play.word);
    setEditPointsValue(play.points.toString());
    setIsEditInputActive(false);
  };

  const handleRemoveWord = () => {
    if (!selectedPlayRef) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;
    const updated = players.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { ...newPlays[playIdx], isRemoved: true };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    });
    setPlayers(updated);
    setDisplayPlayers([...updated]);
    setSelectedPlayRef(null);
  };

  const handleUndoRemove = (playerId: string, roundIdx: number, playIdx: number) => {
    const updated = players.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { ...newPlays[playIdx], isRemoved: false };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    });
    setPlayers(updated);
    setDisplayPlayers([...updated]);
  };

  const handleEditWord = () => {
    if (!selectedPlayRef || !editWordValue.trim()) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;
    const newPoints = parseInt(editPointsValue) || 0;
    const updated = players.map(p => {
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
    });
    setPlayers(updated);
    setDisplayPlayers([...updated]);
    setSelectedPlayRef(null);
  };

  const handleBingoWord = () => {
    if (!selectedPlayRef) return;
    const { playerId, roundIdx, playIdx } = selectedPlayRef;
    const currentBingo = !!selectedPlayRef.play.isBingo;
    const becomingBingo = !currentBingo;
    const updated = players.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { 
        ...newPlays[playIdx], 
        points: currentBingo ? newPlays[playIdx].points - 50 : newPlays[playIdx].points + 50,
        isBingo: becomingBingo
      };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    });
    setPlayers(updated);
    setDisplayPlayers([...updated]);
    setSelectedPlayRef(null);
    if (becomingBingo && clickCoords) {
      setTimeout(() => {
        setConfetti({ x: clickCoords.x, y: clickCoords.y, id: Date.now() });
        setTimeout(() => setConfetti(null), 4000);
      }, 300);
    }
  };

  useEffect(() => {
    if (editingPlayerId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPlayerId]);

  const handleVerifyWord = async () => {
    if (wordInput.trim().length < 2) return;
    setIsLoadingDef(true);
    const res = await defineWord(wordInput);
    setDefinition(res);
    setIsLoadingDef(false);
  };

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
    
    setIsInputModalOpen(false);
    
    setTimeout(() => {
      setPlayers(current => {
        setDisplayPlayers([...current]);
        return current;
      });
      if (currentPlayerIndex === players.length - 1) {
        setGameRound(prev => prev + 1);
      }
      setCurrentPlayerIndex(prev => (prev + 1) % players.length);
    }, 300);

    setWordInput('');
    setPointsInput('');
    setDefinition(null);
    setEditingPlayerId(null);
  }, [players.length, currentPlayerIndex, gameRound]);

  const currentPlayer = players[currentPlayerIndex];
  const currentRoundPlays = currentPlayer.turns[gameRound - 1]?.plays || [];
  const roundTotal = currentRoundPlays.reduce((sum, p) => p.isRemoved ? sum : sum + p.points, 0);
  const confettiColors = ['#F59E0B', '#FCD34D', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-stone-100 pb-12 flex flex-col">
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-[200]">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle 
              key={`${confetti.id}-${i}`} 
              x={confetti.x} 
              y={confetti.y} 
              color={confettiColors[i % confettiColors.length]} 
            />
          ))}
        </div>
      )}

      {/* Regression Test Modal */}
      <TestModal 
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        results={testResults}
      />

      {/* Play Management Modal */}
      <AnimatePresence>
        {selectedPlayRef && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/70 backdrop-blur-sm" 
              onClick={() => setSelectedPlayRef(null)}
            />
            <MotionDiv 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-md overflow-hidden"
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
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>

      {/* Add Word Modal */}
      <AnimatePresence>
        {isInputModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" 
              onClick={() => setIsInputModalOpen(false)}
            />
            <MotionDiv 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#0c1a26] p-8 text-white relative">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setIsInputModalOpen(false)} className="p-2 text-stone-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-amber-500 p-2 rounded-xl text-stone-900">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest text-amber-500">Add Words</h3>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold scrabble-font">{currentPlayer.name}</span>
                  <span className="text-stone-500 font-bold uppercase text-xs tracking-[0.2em]">Round {gameRound}</span>
                </div>
              </div>

              <div className="bg-amber-50/80 p-6 border-b border-amber-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Turn Summary</h4>
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-200/50 rounded-lg border border-amber-300">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Turn Total</span>
                    <span className="text-base font-bold text-stone-900">{roundTotal}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {currentRoundPlays.filter(p => p.word !== '—').length > 0 ? (
                    currentRoundPlays.map((play, idx) => (
                      <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all ${play.isRemoved ? 'bg-stone-200/50 border-stone-200 grayscale opacity-50' : 'bg-white border-amber-200'}`}>
                        <span className="text-sm font-black text-stone-800 uppercase">{play.word}</span>
                        <span className={`text-[10px] font-bold px-1.5 rounded ${play.isBingo ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                          {play.points}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-400 italic">No words added to this turn yet.</p>
                  )}
                </div>
              </div>

              <div className="p-8 space-y-6 flex-grow overflow-y-auto">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-black text-stone-500 uppercase tracking-[0.2em]">Word Played</label>
                      
                      {/* Unified Legality & Verification Area */}
                      {WORD_CHECKER !== 'NONE' && wordInput.trim().length >= 2 && (
                        <div className="flex items-center gap-2">
                          {legalityStatus === 'none' && !isLoadingDef ? (
                            <button
                              onClick={handleVerifyWord}
                              className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg border border-amber-300 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                              <Search size={12} />
                              Verify Word
                            </button>
                          ) : (
                            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                              legalityStatus === 'loading' ? 'text-amber-500' : 
                              legalityStatus === 'legal' ? 'text-green-600' : 
                              legalityStatus === 'illegal' ? 'text-red-500' : 'text-stone-400'
                            }`}>
                              {legalityStatus === 'loading' ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : legalityStatus === 'legal' ? (
                                <Check size={12} />
                              ) : (
                                <X size={12} />
                              )}
                              {legalityStatus === 'loading' ? 'Verifying...' : 
                               legalityStatus === 'legal' ? 'Legal' : 
                               legalityStatus === 'illegal' ? 'Not Legal' : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <input
                      autoFocus
                      type="text"
                      value={wordInput}
                      onChange={(e) => {
                        setWordInput(e.target.value.toUpperCase());
                        if (WORD_CHECKER === 'AI') setDefinition(null); // Reset result on change
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && submitWord()}
                      placeholder="e.g. LEXICON"
                      className={`w-full bg-stone-50 border-2 rounded-2xl px-5 py-4 text-xl font-bold tracking-widest focus:ring-4 transition-all outline-none ${
                        legalityStatus === 'legal' 
                          ? 'border-green-200 focus:ring-green-500/10 focus:border-green-500' 
                          : legalityStatus === 'illegal'
                            ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500'
                            : 'border-stone-200 focus:ring-amber-500/10 focus:border-amber-500'
                      }`}
                    />
                    {wordListStatus === 'error' && WORD_CHECKER === 'LOCAL' && (
                      <p className="text-[10px] text-red-400 italic">Error loading dictionary. Check console.</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Points</label>
                    <input
                      type="number"
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitWord()}
                      placeholder="0"
                      className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-5 py-4 text-2xl font-bold focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                    />
                  </div>
                </div>

                {WORD_CHECKER === 'AI' && (definition || isLoadingDef) && (
                  <div className="p-5 bg-stone-50 rounded-2xl border border-amber-200/50 flex gap-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-lg h-fit shrink-0">
                      <Info className="text-amber-700" size={20} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">AI Word Insight</h4>
                      {isLoadingDef ? (
                        <div className="flex gap-1.5 py-1">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-100"></div>
                        </div>
                      ) : (
                        <p className="text-sm text-stone-700 italic leading-relaxed">
                          {definition.replace(/^(VALID|INVALID)\s*:\s*/i, '')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-stone-50 border-t border-stone-100 flex gap-4">
                <button
                  onClick={submitWord}
                  disabled={!wordInput || !pointsInput}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 py-5 rounded-2xl font-black text-xl shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1"
                >
                  <Plus size={24} />
                  ADD WORD
                </button>
                
                <button
                  onClick={endTurn}
                  className="flex-1 bg-[#0c1a26] hover:bg-[#1a2e40] text-amber-500 py-5 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-2 shadow-xl border-b-4 border-black active:border-b-0 active:translate-y-1"
                >
                  <SkipForward size={24} />
                  END TURN
                </button>
              </div>
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>

      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsResetModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-md overflow-hidden transform transition-all animate-in zoom-in fade-in duration-200 border-t-8 border-amber-500">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-amber-600" size={32} />
              </div>
              <h3 className="text-3xl font-bold scrabble-font text-stone-900 mb-3">Reset Game?</h3>
              <p className="text-stone-500 leading-relaxed mb-8">
                Are you sure you want to clear all scores? This action will permanently erase current progress.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setIsResetModalOpen(false)} className="flex-1 px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-bold transition-all active:scale-95">No, Keep Playing</button>
                <button onClick={performReset} className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 transition-all active:scale-95">Yes, Reset All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Header & Turn Status Bar */}
      <div className="sticky top-0 z-[100] flex flex-col shadow-2xl">
        <header className="bg-[#0c1a26] text-white py-6 border-b-4 border-amber-500">
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
                <p className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mt-2">By BitDeserty Studios</p>
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
                disabled={isGameStarted || players.length >= MAX_PLAYERS}
                onClick={addPlayer}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95 font-bold ${
                  isGameStarted || players.length >= MAX_PLAYERS
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

        {/* Floating Current Turn Bar */}
        <div className="bg-[#0c1a26]/95 backdrop-blur-md border-b-8 border-amber-600 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] hidden sm:block">Current Turn</span>
              <h2 className="text-2xl sm:text-4xl font-bold text-white scrabble-font">{currentPlayer.name}</h2>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-stone-500 text-[10px] font-black uppercase tracking-[0.4em] hidden sm:block">Active Round</span>
               <span className="text-2xl sm:text-3xl font-black text-amber-500/40 tabular-nums">#{gameRound.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:grid lg:grid-cols-12 gap-8 mt-8 flex-grow w-full overflow-x-hidden">
        <div className="w-full min-w-0 lg:col-span-8 flex flex-col gap-6 order-1 lg:order-2">
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col min-h-[600px]">
            <div className="bg-[#0c1a26] p-5 border-b border-amber-500/30 flex justify-between items-center">
              <h2 className="font-bold text-white flex items-center gap-3">
                <ClipboardList className="text-amber-500" size={24} />
                Score Sheet
              </h2>
            </div>
            
            <div className="overflow-auto flex-grow custom-scrollbar flex flex-col">
              <table className="w-full text-left border-collapse min-w-[600px] h-full flex flex-col">
                <thead className="block bg-stone-50 border-b border-stone-200">
                  <tr className="grid" style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
                    <th className="px-4 py-5 text-center text-stone-400 border-r border-stone-100 flex items-center justify-center">
                      <Hash size={16} className="opacity-40" />
                    </th>
                    {players.map((p, idx) => (
                      <th key={p.id} className={`px-4 py-5 relative group transition-colors flex items-center ${idx === currentPlayerIndex ? 'bg-amber-50/50' : ''}`}>
                        {editingPlayerId === p.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-150 w-full">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePlayerName();
                                if (e.key === 'Escape') cancelEditingName();
                              }}
                              onBlur={savePlayerName}
                              className="w-full bg-white border-2 border-amber-400 rounded-lg px-2 py-1 text-stone-800 font-bold outline-none shadow-sm focus:ring-4 focus:ring-amber-500/10"
                              placeholder="Player name..."
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span 
                                onClick={() => startEditingName(p)}
                                className={`font-black text-lg tracking-tight truncate cursor-pointer hover:text-amber-600 transition-colors ${idx === currentPlayerIndex ? 'text-amber-700' : 'text-stone-800'}`}
                              >
                                {p.name}
                              </span>
                              <button 
                                onClick={() => startEditingName(p)} 
                                className="text-stone-300 hover:text-amber-500 transition-colors opacity-20 group-hover:opacity-100 p-1 shrink-0"
                                title="Edit Name"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                            {!isGameStarted && players.length > 1 && (
                              <button 
                                onClick={() => removePlayer(p.id)} 
                                className="text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1"
                                title="Remove Player"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="block flex-grow divide-y divide-stone-100">
                  {Array.from({ length: Math.max(gameRound, 1) }).map((_, roundIdx) => (
                    <tr key={roundIdx} className={`grid transition-all duration-300 ${roundIdx === gameRound - 1 ? 'bg-amber-50/10' : 'hover:bg-stone-50/50'}`} style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
                      <td className="px-1 py-5 text-center border-r border-stone-100 bg-stone-50/30 flex items-center justify-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black text-stone-500 bg-stone-100 border border-stone-200 shadow-sm">
                          {roundIdx + 1}
                        </span>
                      </td>
                      {players.map((p, playerIdx) => {
                        const turn = p.turns[roundIdx];
                        const isCurrentTurnCell = playerIdx === currentPlayerIndex && roundIdx === gameRound - 1;
                        const roundTotal = turn ? turn.plays.reduce((sum, play) => play.isRemoved ? sum : sum + play.points, 0) : 0;
                        
                        return (
                          <td key={p.id} className={`px-4 py-5 border-l border-stone-50/50 relative flex flex-col justify-center ${isCurrentTurnCell ? 'bg-amber-100/20 ring-inset ring-2 ring-amber-500/20' : ''}`}>
                            {turn ? (
                              <div className="flex flex-col gap-2">
                                {turn.plays.map((play, playIdx) => {
                                  if (play.isRemoved) {
                                    return (
                                      <button 
                                        key={playIdx}
                                        onClick={() => handleUndoRemove(p.id, roundIdx, playIdx)}
                                        className="flex items-center justify-between w-full text-left p-1.5 rounded-lg bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all group/undo"
                                      >
                                        <span className="text-[9px] font-black text-stone-400 uppercase tracking-tighter flex items-center gap-1.5 italic">
                                          <Trash2 size={10} className="opacity-50" /> Removed
                                        </span>
                                        <span className="text-[9px] font-black bg-stone-200 px-1.5 py-0.5 rounded text-stone-600 group-hover/undo:bg-amber-500 group-hover/undo:text-white transition-colors">
                                          Undo
                                        </span>
                                      </button>
                                    );
                                  }
                                  
                                  return (
                                    <button 
                                      key={playIdx} 
                                      onClick={(e) => handlePlayClick(e, p.id, roundIdx, playIdx, play)}
                                      className={`flex items-center justify-between w-full text-left p-1.5 rounded-lg hover:bg-stone-100/80 transition-all group/play ${play.word === '—' ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                                    >
                                      <span className={`text-base leading-tight break-words max-w-[150px] uppercase tracking-wide ${
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
                                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">SUM</span>
                                      <span className="text-[11px] font-black text-amber-700">{roundTotal}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : isCurrentTurnCell ? null : (
                              <span className="text-stone-200 text-xl font-light opacity-50">—</span>
                            )}

                            {isCurrentTurnCell && (
                              <div ref={activeCellRef} className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500 scroll-mt-24">
                                <button 
                                  onClick={() => setIsInputModalOpen(true)}
                                  className="w-full py-3 border-2 border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center gap-1 text-amber-600 hover:bg-amber-50 hover:border-amber-400 transition-all active:scale-95 group"
                                >
                                  <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Words</span>
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="block sticky bottom-0 bg-[#0c1a26] text-white font-bold border-t-4 border-amber-500 shadow-[0_-8px_15px_rgba(0,0,0,0.3)] mt-auto z-10">
                  <tr className="grid" style={{ gridTemplateColumns: `48px repeat(${players.length}, 1fr)` }}>
                    <td className="px-4 py-8 border-r border-stone-700"></td>
                    {players.map((p) => {
                      const stats = getPlayerStats(p);
                      return (
                        <td key={p.id} className="px-4 py-8 text-4xl scrabble-font text-white drop-shadow-md flex items-center">
                          {stats.totalScore}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div ref={standingsRef} className="w-full min-w-0 lg:col-span-4 space-y-6 order-2 lg:order-1 scroll-mt-24">
          <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
            <div className="bg-amber-50 p-5 border-b border-amber-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <Trophy size={18} className="text-amber-600" />
                Leaderboard
              </h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-200 px-3 py-1.5 rounded-lg shadow-sm">
                Round {gameRound}
              </span>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {rankedPlayers.map((p) => (
                    <MotionDiv key={p.id} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                      <StatsCard
                        name={p.name}
                        stats={getPlayerStats(p)}
                        isActive={p.id === currentPlayer.id}
                      />
                    </MotionDiv>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="w-full mt-12 mb-8 px-4 text-center">
        {/* Regression Test Button */}
        <div className="mb-4">
          <button 
            onClick={handleRunDiagnostics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <Beaker size={14} />
            Run UI Diagnostics
          </button>
        </div>
        
        <p className="text-stone-500 text-sm font-medium leading-relaxed max-w-2xl mx-auto">
          Copyright 2026 BitDeserty Studios, a Company of BitDeserty LLC. 
          <span className="hidden sm:inline"> • </span>
          <br className="sm:hidden" />
          Word Validator powered by Gemini API
        </p>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default App;
