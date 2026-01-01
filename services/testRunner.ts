
import { Player, Play, PlayerStats } from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message: string;
}

export function runRegressionSuite(getPlayerStats: (player: Player) => PlayerStats): TestResult[] {
  const results: TestResult[] = [];

  // Test Case 1: Basic Scoring
  const player1: Player = {
    id: 'test-1',
    name: 'Test Bot',
    turns: [
      { plays: [{ word: 'HELLO', points: 10 }], timestamp: Date.now() }
    ]
  };
  const stats1 = getPlayerStats(player1);
  results.push({
    name: 'Basic Score Calculation',
    passed: stats1.totalScore === 10,
    expected: 10,
    actual: stats1.totalScore,
    message: 'Calculates simple word points correctly.'
  });

  // Test Case 2: Bingo Bonus Logic
  const player2: Player = {
    id: 'test-2',
    name: 'Bingo Bot',
    turns: [
      { plays: [{ word: 'BINGOS', points: 65, isBingo: true }], timestamp: Date.now() }
    ]
  };
  const stats2 = getPlayerStats(player2);
  results.push({
    name: 'Bingo Bonus Validation',
    passed: stats2.totalScore === 65,
    expected: 65,
    actual: stats2.totalScore,
    message: 'Verifies points include the 50pt Bingo bonus.'
  });

  // Test Case 3: Removed Words Exclusion
  const player3: Player = {
    id: 'test-3',
    name: 'Cleanup Bot',
    turns: [
      { plays: [
        { word: 'KEEP', points: 20 },
        { word: 'DELETE', points: 50, isRemoved: true }
      ], timestamp: Date.now() }
    ]
  };
  const stats3 = getPlayerStats(player3);
  results.push({
    name: 'Removed Word Exclusion',
    passed: stats3.totalScore === 20,
    expected: 20,
    actual: stats3.totalScore,
    message: 'Ensures removed words are not counted in total score.'
  });

  // Test Case 4: Statistics Accuracy (Average)
  const player4: Player = {
    id: 'test-4',
    name: 'Stat Bot',
    turns: [
      { plays: [{ word: 'A', points: 10 }, { word: 'B', points: 20 }], timestamp: Date.now() }
    ]
  };
  const stats4 = getPlayerStats(player4);
  results.push({
    name: 'Average Points Per Word',
    passed: stats4.averagePoints === 15,
    expected: 15,
    actual: stats4.averagePoints,
    message: 'Calculates the correct mean across multiple plays.'
  });

  // Test Case 5: UI Integrity (Floating Header)
  // Check for the specific class that implements the sticky behavior
  const turnIndicator = document.querySelector('.turn-indicator-sticky');
  results.push({
    name: 'Floating Turn Indicator',
    passed: !!turnIndicator,
    expected: true,
    actual: !!turnIndicator,
    message: 'Ensures the current turn box is set to floating/sticky mode.'
  });

  // Test Case 6: Layout Integrity
  results.push({
    name: 'UI Layout Integrity',
    passed: !!document.querySelector('.min-h-screen'),
    expected: true,
    actual: !!document.querySelector('.min-h-screen'),
    message: 'Ensures main layout container exists in the DOM.'
  });

  return results;
}
