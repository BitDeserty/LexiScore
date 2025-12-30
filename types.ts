
export interface Turn {
  word: string;
  points: number;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  turns: Turn[];
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  isGameStarted: boolean;
}

export interface PlayerStats {
  totalScore: number;
  averagePoints: number;
  highestWord: { word: string; points: number } | null;
  wordCount: number;
}
