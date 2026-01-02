
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, SkipForward, AlertTriangle, Type, Zap, Trash2, Search, Check, Loader2, Info, Pencil } from 'lucide-react';
import { Play } from '../types';
import { defineWord } from '../services/geminiService';
import confetti from 'canvas-confetti';

const MotionDiv = motion.div as any;

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void; zIndex?: number }> = ({ children, onClose, zIndex = 200 }) => (
  <div 
    className="fixed inset-0 flex items-center justify-center p-4 modal-overlay-container"
    style={{ zIndex }}
  >
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-900/80 backdrop-blur-md" onClick={onClose} />
    {children}
  </div>
);

/**
 * Modal to add words and points for a player's turn.
 */
export const AddWordModal: React.FC<{
  isOpen: boolean; onClose: () => void; playerName: string; gameRound: number; 
  onAddWord: (w: string, p: number) => void; onRemoveWord: (idx: number) => void;
  onEndTurn: () => void; currentPlays: Play[];
}> = ({ isOpen, onClose, playerName, gameRound, onAddWord, onRemoveWord, onEndTurn, currentPlays }) => {
  const [wordInput, setWordInput] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [definition, setDefinition] = useState<string | null>(null);
  const [isLoadingDef, setIsLoadingDef] = useState(false);

  const handleSubmit = () => {
    const pts = parseInt(pointsInput);
    if (!wordInput.trim() || isNaN(pts)) return;
    onAddWord(wordInput.toUpperCase(), pts);
    setWordInput('');
    setPointsInput('');
    setDefinition(null);
  };

  const handleVerify = async () => {
    if (wordInput.length < 2) return;
    setIsLoadingDef(true);
    const res = await defineWord(wordInput);
    setDefinition(res);
    setIsLoadingDef(false);
  };

  const handleEditFromSummary = (play: Play, originalIndex: number) => {
    setWordInput(play.word);
    setPointsInput(play.points.toString());
    setDefinition(null);
    onRemoveWord(originalIndex);
  };

  // Determine legality based on AI response format
  const isLegal = definition?.trim().toUpperCase().startsWith('VALID');
  const isIllegal = definition?.trim().toUpperCase().startsWith('INVALID');

  // Calculate current turn metrics
  const roundTotal = currentPlays.reduce((sum, p) => p.isRemoved ? sum : sum + p.points, 0);
  const displayPlays = currentPlays.filter(p => p.word !== 'PASSED' && p.word !== '—');

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalWrapper onClose={onClose}>
          <MotionDiv initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#0c1a26] p-8 text-white relative">
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white"><X size={24} /></button>
              <h3 className="text-xl font-black uppercase tracking-widest text-amber-500 mb-2">Add Words</h3>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold scrabble-font">{playerName}</span>
                <span className="text-stone-500 uppercase text-xs">Round {gameRound}</span>
              </div>
            </div>

            {/* Turn Summary Section */}
            <div className="bg-amber-50/80 p-6 border-b border-amber-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Turn Summary</h4>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-200/50 rounded-lg border border-amber-300">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Turn Total</span>
                  <span className="text-base font-bold text-stone-900">{roundTotal}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                {displayPlays.length > 0 ? (
                  displayPlays.map((play, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleEditFromSummary(play, idx)}
                      title="Click to edit"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all hover:scale-105 active:scale-95 group ${play.isRemoved ? 'bg-stone-200/50 border-stone-200 grayscale opacity-50' : 'bg-white border-amber-200'}`}
                    >
                      <span className="text-sm font-black text-stone-800 uppercase">{play.word}</span>
                      <span className={`text-[10px] font-bold px-1.5 rounded ${play.isBingo ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                        {play.points}
                      </span>
                      <Pencil size={10} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">No words added to this turn yet.</p>
                )}
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex justify-between items-center h-8">
                  <label className="text-xs font-black text-stone-500 uppercase">Word Played</label>
                  
                  {/* Dynamic Verify Area */}
                  {wordInput.length >= 2 && (
                    <div className="flex items-center">
                      {!definition && !isLoadingDef && (
                        <button 
                          onClick={handleVerify} 
                          className="verify-button text-[10px] bg-amber-100 hover:bg-amber-200 border border-amber-200 px-3 py-1 rounded-lg text-amber-700 font-black transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Search size={12} />
                          VERIFY
                        </button>
                      )}
                      
                      {isLoadingDef && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-black uppercase">
                          <Loader2 size={12} className="animate-spin" />
                          Verifying...
                        </div>
                      )}

                      {definition && !isLoadingDef && (
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${isLegal ? 'text-green-600' : 'text-red-600'}`}>
                          {isLegal ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          {isLegal ? 'LEGAL' : 'ILLEGAL'}
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
                    setDefinition(null); // Reset verification status on change
                  }} 
                  className={`w-full border-2 p-4 rounded-2xl text-xl font-bold transition-all focus:outline-none bg-white text-stone-900 ${
                    isLegal ? 'border-green-500 bg-green-50/30' : 
                    isIllegal ? 'border-red-500 bg-red-50/30' : 
                    'border-stone-200 focus:border-amber-500'
                  }`} 
                  placeholder="EX: LEXICON" 
                />

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-500 uppercase">Points</label>
                  <input 
                    type="number" 
                    value={pointsInput} 
                    onChange={(e) => setPointsInput(e.target.value)} 
                    onKeyDown={(e) => { if(e.key === 'Enter') handleSubmit(); }}
                    className="w-full border-2 p-4 rounded-2xl text-xl font-bold focus:outline-none focus:border-amber-500 bg-white text-stone-900" 
                    placeholder="Points" 
                  />
                </div>
              </div>
              
              {definition && (
                <div className={`p-5 rounded-2xl border flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${isLegal ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                  <div className={`p-2 rounded-lg h-fit ${isLegal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <Info size={18} />
                  </div>
                  <div>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isLegal ? 'text-green-700' : 'text-red-700'}`}>AI Definition</h4>
                    <p className="text-sm text-stone-700 italic leading-relaxed">
                      {definition.replace(/^(VALID|INVALID)\s*:\s*/i, '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-stone-50 border-t flex gap-4">
              <button 
                onClick={handleSubmit} 
                disabled={!wordInput || !pointsInput}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-white py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95"
              >
                ADD WORD
              </button>
              <button 
                onClick={onEndTurn} 
                className="flex-1 bg-[#0c1a26] hover:bg-[#1a2e40] text-amber-500 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95"
              >
                END TURN
              </button>
            </div>
          </MotionDiv>
        </ModalWrapper>
      )}
    </AnimatePresence>
  );
};

/**
 * Modal to confirm resetting the entire game.
 */
export const ResetModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <ModalWrapper onClose={onClose}>
        <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center border-t-8 border-amber-500">
          <AlertTriangle className="mx-auto text-amber-600 mb-4" size={48} />
          <h3 className="text-3xl font-bold mb-2">Reset Game?</h3>
          <p className="text-stone-500 mb-8">This will clear all scores and progress.</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 bg-stone-100 py-4 rounded-xl font-bold text-stone-900">Cancel</button>
            <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold">Reset All</button>
          </div>
        </MotionDiv>
      </ModalWrapper>
    )}
  </AnimatePresence>
);

/**
 * Modal to confirm skipping a turn when no words are added.
 */
export const SkipConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <ModalWrapper onClose={onClose}>
        <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center border-t-8 border-blue-500">
          <SkipForward className="mx-auto text-blue-600 mb-4" size={48} />
          <h3 className="text-3xl font-bold mb-2">Skip Turn?</h3>
          <p className="text-stone-500 mb-8">No words were entered. Mark this turn as PASSED?</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 bg-stone-100 py-4 rounded-xl font-bold text-stone-900">Back</button>
            <button onClick={onConfirm} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold">Confirm Pass</button>
          </div>
        </MotionDiv>
      </ModalWrapper>
    )}
  </AnimatePresence>
);

/**
 * Modal to modify or remove an existing play.
 */
export const PlayOptionsModal: React.FC<{
  selectedPlay: { playerId: string, roundIdx: number, playIdx: number, play: Play };
  onClose: () => void;
  onModify: (updates: Partial<Play>) => void;
}> = ({ selectedPlay, onClose, onModify }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editWord, setEditWord] = useState(selectedPlay.play.word);
  const [editPoints, setEditPoints] = useState(selectedPlay.play.points.toString());

  const handleSaveEdit = () => {
    const pts = parseInt(editPoints);
    if (!editWord.trim() || isNaN(pts)) return;
    onModify({ word: editWord.toUpperCase(), points: pts, isEdited: true });
  };

  const handleBingoToggle = (e: React.MouseEvent) => {
    const isEnabling = !selectedPlay.play.isBingo;
    
    if (isEnabling) {
      const rect = e.currentTarget.getBoundingClientRect();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { 
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight 
        },
        colors: ['#f59e0b', '#fbbf24', '#ffffff', '#d97706'],
        disableForReducedMotion: true
      });
    }

    onModify({ 
      isBingo: isEnabling, 
      points: isEnabling ? selectedPlay.play.points + 50 : selectedPlay.play.points - 50 
    });
  };

  return (
    <ModalWrapper onClose={onClose}>
      <MotionDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden text-stone-900">
        <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
          <h3 className="text-xl font-bold">{isEditing ? 'Edit Word' : selectedPlay.play.word}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <div className="p-8">
          {isEditing ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Word</label>
                <input 
                  autoFocus
                  type="text" 
                  value={editWord} 
                  onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                  className="w-full border-2 border-stone-200 focus:border-amber-500 p-4 rounded-2xl text-xl font-bold outline-none transition-colors bg-white text-stone-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Points</label>
                <input 
                  type="number" 
                  value={editPoints} 
                  onChange={(e) => setEditPoints(e.target.value)}
                  className="w-full border-2 border-stone-200 focus:border-amber-500 p-4 rounded-2xl text-xl font-bold outline-none transition-colors bg-white text-stone-900"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={!editWord.trim() || isNaN(parseInt(editPoints))}
                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-stone-200 transition-all active:scale-95 shadow-lg shadow-amber-200"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <button 
                onClick={() => setIsEditing(true)} 
                className="flex items-center gap-4 p-5 bg-amber-50 text-amber-700 rounded-2xl hover:bg-amber-100 transition-all active:scale-95 group border border-amber-100"
              >
                <Pencil className="group-hover:rotate-12 transition-transform" />
                <span className="font-bold">Edit Word Details</span>
              </button>
              
              <button 
                onClick={handleBingoToggle} 
                className="flex items-center gap-4 p-5 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all active:scale-95 group border border-stone-100"
              >
                <Zap className={`${selectedPlay.play.isBingo ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} /> 
                <span className="font-bold">{selectedPlay.play.isBingo ? 'Remove Bingo Bonus' : 'Mark as Bingo (+50)'}</span>
              </button>
              
              <div className="h-px bg-stone-100 my-2" />
              
              <button 
                onClick={() => onModify({ isRemoved: true })} 
                className="flex items-center gap-4 p-5 bg-red-50 text-red-700 rounded-2xl hover:bg-red-100 transition-all active:scale-95 border border-red-100"
              >
                <Trash2 /> 
                <span className="font-bold">Remove from Turn</span>
              </button>
            </div>
          )}
        </div>
      </MotionDiv>
    </ModalWrapper>
  );
};
