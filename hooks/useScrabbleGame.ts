
import { useState, useCallback } from 'react';
import { Player, PlayerStats, Play } from '../types';

const STORAGE_KEY = 'lexiscore_game_state_v1';

export const useScrabbleGame = () => {
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

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(
    initialState?.currentPlayerIndex ?? 0
  );

  const [gameRound, setGameRound] = useState(
    initialState?.gameRound ?? 1
  );

  const persist = (p: Player[], c: number, r: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      players: p,
      currentPlayerIndex: c,
      gameRound: r
    }));
  };

  const getPlayerStats = useCallback((player: Player): PlayerStats => {
    let totalScore = 0;
    let allPlays: Play[] = [];
    player.turns.forEach(turn => {
      if (turn) {
        turn.plays.forEach(play => {
          if (play.word !== 'PASSED' && play.word !== '—' && !play.isRemoved) {
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

  const addPlayer = useCallback((max: number) => {
    if (players.length >= max) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newPlayers = [...players, { id: newId, name: `Player ${players.length + 1}`, turns: [] }];
    setPlayers(newPlayers);
    persist(newPlayers, currentPlayerIndex, gameRound);
  }, [players, currentPlayerIndex, gameRound]);

  const removePlayer = useCallback((id: string) => {
    if (players.length <= 1) return;
    const newPlayers = players.filter(p => p.id !== id);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    persist(newPlayers, 0, gameRound);
  }, [players, gameRound]);

  const updatePlayerName = useCallback((id: string, name: string) => {
    const newPlayers = players.map(p => p.id === id ? { ...p, name } : p);
    setPlayers(newPlayers);
    persist(newPlayers, currentPlayerIndex, gameRound);
  }, [players, currentPlayerIndex, gameRound]);

  const resetGame = useCallback(() => {
    const fresh = players.map(p => ({ ...p, turns: [] }));
    setPlayers(fresh);
    setCurrentPlayerIndex(0);
    setGameRound(1);
    persist(fresh, 0, 1);
  }, [players]);

  const addWordToTurn = useCallback((word: string, points: number) => {
    const roundIdx = gameRound - 1;
    const newPlay: Play = { word, points };
    const updated = [...players];
    const player = { ...updated[currentPlayerIndex] };
    const newTurns = [...player.turns];
    if (newTurns[roundIdx]) {
      const filtered = newTurns[roundIdx].plays.filter(p => p.word !== 'PASSED' && p.word !== '—');
      newTurns[roundIdx] = { ...newTurns[roundIdx], plays: [...filtered, newPlay] };
    } else {
      newTurns[roundIdx] = { plays: [newPlay], timestamp: Date.now() };
    }
    player.turns = newTurns;
    updated[currentPlayerIndex] = player;
    setPlayers(updated);
    persist(updated, currentPlayerIndex, gameRound);
  }, [players, currentPlayerIndex, gameRound]);

  const removeWordFromTurn = useCallback((playIndex: number) => {
    const roundIdx = gameRound - 1;
    const updated = [...players];
    const player = { ...updated[currentPlayerIndex] };
    const newTurns = [...player.turns];
    if (newTurns[roundIdx]) {
      const newPlays = [...newTurns[roundIdx].plays];
      newPlays.splice(playIndex, 1);
      newTurns[roundIdx] = { ...newTurns[roundIdx], plays: newPlays };
      player.turns = newTurns;
      updated[currentPlayerIndex] = player;
      setPlayers(updated);
      persist(updated, currentPlayerIndex, gameRound);
    }
  }, [players, currentPlayerIndex, gameRound]);

  const endTurn = useCallback((isPass: boolean = false) => {
    const roundIdx = gameRound - 1;
    const updated = [...players];
    const player = { ...updated[currentPlayerIndex] };
    const newTurns = [...player.turns];
    
    if (isPass || !newTurns[roundIdx]) {
      newTurns[roundIdx] = { plays: [{ word: 'PASSED', points: 0 }], timestamp: Date.now() };
    }
    
    player.turns = newTurns;
    updated[currentPlayerIndex] = player;
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextRound = nextPlayerIndex === 0 ? gameRound + 1 : gameRound;
    
    setPlayers(updated);
    setCurrentPlayerIndex(nextPlayerIndex);
    setGameRound(nextRound);
    persist(updated, nextPlayerIndex, nextRound);
  }, [players, currentPlayerIndex, gameRound]);

  const modifyPlay = useCallback((playerId: string, roundIdx: number, playIdx: number, updates: Partial<Play>) => {
    const updated = players.map(p => {
      if (p.id !== playerId) return p;
      const newTurns = [...p.turns];
      const turn = { ...newTurns[roundIdx] };
      if (!turn || !turn.plays) return p;
      const newPlays = [...turn.plays];
      newPlays[playIdx] = { ...newPlays[playIdx], ...updates };
      newTurns[roundIdx] = { ...turn, plays: newPlays };
      return { ...p, turns: newTurns };
    });
    setPlayers(updated);
    persist(updated, currentPlayerIndex, gameRound);
  }, [players, currentPlayerIndex, gameRound]);

  return {
    players,
    currentPlayerIndex,
    gameRound,
    getPlayerStats,
    addPlayer,
    removePlayer,
    updatePlayerName,
    resetGame,
    addWordToTurn,
    removeWordFromTurn,
    endTurn,
    modifyPlay
  };
};
