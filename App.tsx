
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Trophy, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from './types';
import StatsCard from './components/StatsCard';
import TestModal from './components/TestModal';
import { useScrabbleGame } from './hooks/useScrabbleGame';
import { runRegressionSuite, TestResult } from './services/testRunner';
import { GameHeader, TurnStatusBar } from './components/GameHeader';
import { ScoreSheet } from './components/ScoreSheet';
import { AddWordModal, ResetModal, SkipConfirmModal, PlayOptionsModal } from './components/GameModals';

const MAX_PLAYERS = 4;

const App: React.FC = () => {
  const {
    players, currentPlayerIndex, gameRound, getPlayerStats,
    addPlayer, removePlayer, updatePlayerName, resetGame,
    addWordToTurn, removeWordFromTurn, endTurn, modifyPlay
  } = useScrabbleGame();

  // UI States
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSkipConfirmModalOpen, setIsSkipConfirmModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedPlayRef, setSelectedPlayRef] = useState<{ 
    playerId: string, roundIdx: number, playIdx: number, play: Play 
  } | null>(null);

  const activeCellRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const standingsRef = useRef<HTMLDivElement>(null);

  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => getPlayerStats(b).totalScore - getPlayerStats(a).totalScore);
  }, [players, getPlayerStats]);

  const isGameStarted = useMemo(() => players.some(p => p.turns.length > 0), [players]);

  const handlePlayClick = (e: React.MouseEvent, playerId: string, roundIdx: number, playIdx: number, play: Play) => {
    if (play.word === 'PASSED' || play.word === '—' || play.isRemoved) return;
    setSelectedPlayRef({ playerId, roundIdx, playIdx, play });
  };

  const handleEndTurnRequest = () => {
    const currentPlays = players[currentPlayerIndex].turns[gameRound - 1]?.plays || [];
    if (currentPlays.length === 0) setIsSkipConfirmModalOpen(true);
    else {
      endTurn();
      setIsInputModalOpen(false);
    }
  };

  const handleRunDiagnostics = () => {
    setTestResults(runRegressionSuite(getPlayerStats));
    setIsTestModalOpen(true);
  };

  const MotionDiv = motion.div as any;

  return (
    <div className="min-h-screen bg-stone-100 pb-12 flex flex-col text-stone-900">
      <TestModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} results={testResults} />

      <div className="sticky top-0 z-[100] shadow-xl shadow-stone-900/10">
        <GameHeader 
          isGameStarted={isGameStarted} 
          onReset={() => setIsResetModalOpen(true)} 
          onAddPlayer={() => addPlayer(MAX_PLAYERS)}
          maxPlayers={MAX_PLAYERS}
          playerCount={players.length}
        />
        <TurnStatusBar currentPlayerName={players[currentPlayerIndex].name} gameRound={gameRound} />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:grid lg:grid-cols-12 gap-8 mt-8 flex-grow w-full overflow-x-hidden">
        <div className="w-full min-w-0 lg:col-span-8 flex flex-col gap-6 order-1 lg:order-2">
          <ScoreSheet 
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            gameRound={gameRound}
            isGameStarted={isGameStarted}
            editingPlayerId={editingPlayerId}
            editNameValue={editNameValue}
            onStartEditName={(p) => { setEditingPlayerId(p.id); setEditNameValue(p.name); }}
            onSaveName={() => { if (editingPlayerId) updatePlayerName(editingPlayerId, editNameValue); setEditingPlayerId(null); }}
            onCancelEditName={() => setEditingPlayerId(null)}
            onSetNameValue={setEditNameValue}
            onRemovePlayer={removePlayer}
            onUndoRemove={(pId, rIdx, pIdx) => modifyPlay(pId, rIdx, pIdx, { isRemoved: false })}
            onPlayClick={handlePlayClick}
            onOpenAddWord={() => setIsInputModalOpen(true)}
            getPlayerStats={getPlayerStats}
            activeCellRef={activeCellRef}
            editInputRef={editInputRef}
          />
        </div>

        <div ref={standingsRef} className="w-full min-w-0 lg:col-span-4 space-y-6 order-2 lg:order-1 scroll-mt-24">
          <div className="bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
            <div className="bg-amber-50 p-5 border-b border-amber-100 flex items-center justify-between">
              <h2 className="font-bold text-stone-800 flex items-center gap-2"><Trophy size={18} className="text-amber-600" />Leaderboard</h2>
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-200 px-3 py-1.5 rounded-lg">Round {gameRound}</span>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {rankedPlayers.map((p) => (
                  <MotionDiv key={p.id} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                    <StatsCard name={p.name} stats={getPlayerStats(p)} isActive={p.id === players[currentPlayerIndex].id} />
                  </MotionDiv>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full mt-12 mb-8 px-4 text-center">
        <button onClick={handleRunDiagnostics} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black uppercase transition-all"><Beaker size={14} />Run UI Diagnostics</button>
        <p className="text-stone-500 text-sm font-medium mt-4">Copyright 2026 BitDeserty Studios • Word Validator powered by Gemini API</p>
      </footer>

      <AddWordModal 
        isOpen={isInputModalOpen} 
        onClose={() => setIsInputModalOpen(false)} 
        playerName={players[currentPlayerIndex].name} 
        gameRound={gameRound} 
        onAddWord={addWordToTurn} 
        onRemoveWord={removeWordFromTurn}
        onEndTurn={handleEndTurnRequest}
        currentPlays={players[currentPlayerIndex].turns[gameRound - 1]?.plays || []}
      />

      <ResetModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={() => { resetGame(); setIsResetModalOpen(false); }} />
      <SkipConfirmModal isOpen={isSkipConfirmModalOpen} onClose={() => setIsSkipConfirmModalOpen(false)} onConfirm={() => { endTurn(true); setIsSkipConfirmModalOpen(false); setIsInputModalOpen(false); }} />
      
      {selectedPlayRef && (
        <PlayOptionsModal 
          selectedPlay={selectedPlayRef} 
          onClose={() => setSelectedPlayRef(null)} 
          onModify={(updates) => { modifyPlay(selectedPlayRef.playerId, selectedPlayRef.roundIdx, selectedPlayRef.playIdx, updates); setSelectedPlayRef(null); }}
        />
      )}
    </div>
  );
};

export default App;
