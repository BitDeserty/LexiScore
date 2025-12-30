
export interface Play {
  word: string;
  points: number;
  isEdited?: boolean;
  isBingo?: boolean;
  isRemoved?: boolean;
}

export interface Turn {
  plays: Play[];
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
  highestWord: Play | null;
  wordCount: number;
}
