# LexiScore User Interaction Analysis

This document enumerates all user interactions within the LexiScore application. It serves as a reference for regression testing and the development of a future tutorial mode.

## 1. Global & Header Interactions

| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Reset Game** | Click "Reset Game" button in header | Opens a confirmation modal to clear all scores and progress. | Main Header |
| **Add Player** | Click "Add Player" button in header | Adds a new player to the game (up to 4 players). Only available before the game starts. | Main Header |
| **Expand Game Clock** | Click "Game Clock" button in header | Displays the Game Clock control panel above the score sheet. | Main Header |
| **Run UI Diagnostics** | Click "Run UI Diagnostics" in footer | Executes a suite of regression tests and displays results. | Footer |

## 2. Score Sheet Interactions

| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Edit Player Name** | Click player name or pencil icon in table header | Replaces name with an input field for renaming. | Score Sheet Header |
| **Save Player Name** | Press "Enter" or click outside name input | Updates the player's name and persists it. | Score Sheet Header |
| **Cancel Name Edit** | Press "Escape" while editing name | Reverts the name to its previous value. | Score Sheet Header |
| **Remove Player** | Click "X" icon next to player name | Removes the player from the game. Only available before any words are scored. | Score Sheet Header |
| **Open Add Word Dialog** | Click "Add Words" or "Add More" in the active cell | Opens the Add Word modal for the current player's turn. | Active Score Cell |
| **Edit Scored Word** | Click on any scored word in the table | Opens the Play Options modal for that specific play. | Score Sheet Body |
| **Undo Remove Play** | Click "Undo" on a play marked as "Removed" | Restores the play and its points to the turn. | Score Sheet Body |

## 3. Game Clock Controls

| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Minimize Clock** | Click "Game Clock" title or icon in the panel | Pauses the clock and moves the toggle back to the header. | Clock Panel |
| **Start Clock** | Click "START" button | Begins the countdown for the current player. | Clock Panel |
| **Pause Clock** | Click "PAUSE" button | Stops the countdown. | Clock Panel |
| **Adjust Time Pool** | Change value in "Time Pool/Player" input | Prepares a new starting time for all players. | Clock Panel |
| **Adjust Turn Reset** | Change value in "Turn Reset" input | Sets the seconds added back to a player when they time out. | Clock Panel |
| **Apply & Reset Time** | Click "Apply & Reset" (or "Set Time") button | Updates all players' clocks to the new Time Pool and resets timers. | Clock Panel |

## 4. Modal Dialogs

### 4.1. Add Word Modal
| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Enter Word** | Type in "Word Played" field | Accepts alpha characters. Typing a number switches focus to "Points". | Add Word Modal |
| **Enter Points** | Type in "Points" field | Accepts numeric characters. Typing a letter switches focus to "Word". | Add Word Modal |
| **Verify Word** | Click "VERIFY" button | Uses Gemini AI to check word validity and provide a definition. | Add Word Modal |
| **Edit Turn Summary** | Click a word in the "Turn Summary" list | Populates the inputs with that word's data for quick correction. | Add Word Modal |
| **Add Word to Turn** | Click "ADD WORD" or press "Enter" | Adds the word to the current turn and clears inputs. | Add Word Modal |
| **Toggle Bingo (Summary)** | Click Crown icon above a word in summary | Toggles a 50-point bonus for that word with a celebration effect. | Add Word Modal |
| **End Turn** | Click "END TURN" | Finalizes the turn and moves to the next player. | Add Word Modal |

### 4.2. Play Options Modal (Editing Existing Plays)
| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Edit Word Details** | Click "Edit Word Details" | Opens inputs to change the word or points of the selected play. | Play Options Modal |
| **Add Missed Word** | Click "Add Missed Word" | Opens inputs to add a *new* word to the turn this play belongs to. Supports smart field switching. | Play Options Modal |
| **Toggle Bingo** | Click "Mark as Bingo" / "Remove Bingo" | Toggles a 50-point bonus and triggers a confetti effect. | Play Options Modal |
| **Remove Play** | Click "Remove from Turn" | Marks the play as removed (strikes it out on the score sheet). | Play Options Modal |

### 4.3. Confirmation Modals
| User Action | Initiation | Expected Behavior | Context / Dialog |
| :--- | :--- | :--- | :--- |
| **Confirm Reset** | Click "Reset All" | Clears all game data. | Reset Modal |
| **Confirm Pass** | Click "Confirm Pass" | Ends a turn with 0 points and a "PASSED" label. | Skip Confirm Modal |
