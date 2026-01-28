// ============================================
// THE ROYAL CHESS - Premium Chess Game for Dina & Ola
// A story-driven chess experience with emotions, powers, and magic
// ============================================

class ChessGame {
  constructor() {
    // Game State
    this.board = this.initBoard();
    this.currentPlayer = "white"; // white = Dina, black = Ola
    this.gameState = "setup"; // setup, playing, ended
    this.selectedSquare = null;
    this.legalMoves = [];
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.soundEnabled = true;
    this.lastMove = null;

    // Game Config
    this.timeLimit = 15 * 60; // seconds
    this.whiteTime = this.timeLimit;
    this.blackTime = this.timeLimit;
    this.timerInterval = null;

    // Player Stats
    this.players = {
      white: { name: "Dina ♕", personality: "defender" },
      black: { name: "Ola ♔", personality: "defender" },
    };

    // Energy & Powers
    this.energy = { white: 0, black: 0 };
    this.maxEnergy = 5;
    this.powersCost = {
      "queen-rush": 3,
      "double-turn": 4,
      teleport: 5,
      shield: 2,
    };
    this.activePowers = { white: [], black: [] };
    this.shieldedPieces = { white: [], black: [] };
    this.doubleMove = { active: false, movesMade: 0 };
    this.queenRushActive = false;
    this.teleportActive = false;
    this.shieldMode = false; // Waiting to select piece for shield

    // Game Stats
    this.stats = {
      white: { moves: 0, captures: 0, powersUsed: 0 },
      black: { moves: 0, captures: 0, powersUsed: 0 },
    };

    // Mood System
    this.mood = {
      white: "🔥 Focused",
      black: "😎 Calm",
    };

    this.initializeEventListeners();
  }

  // ============================================
  // BOARD INITIALIZATION
  // ============================================

  initBoard() {
    return [
      ["r", "n", "b", "q", "k", "b", "n", "r"],
      ["p", "p", "p", "p", "p", "p", "p", "p"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["P", "P", "P", "P", "P", "P", "P", "P"],
      ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ];
  }

  // ============================================
  // PIECE MOVEMENT & LEGAL MOVES
  // ============================================

  getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? "white" : "black";
  }

  getPieceType(piece) {
    return piece ? piece.toLowerCase() : null;
  }

  isLegalMove(fromRow, fromCol, toRow, toCol, testMode = false) {
    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;

    const pieceColor = this.getPieceColor(piece);
    const targetPiece = this.board[toRow][toCol];
    const targetColor = this.getPieceColor(targetPiece);

    // Cannot capture own piece
    if (targetColor === pieceColor) return false;

    const type = this.getPieceType(piece);
    let isLegal = false;

    // If Queen Rush is active, any piece can move like a queen
    if (this.queenRushActive && pieceColor === this.currentPlayer) {
      isLegal = this.isQueenMove(fromRow, fromCol, toRow, toCol);
    } else {
      switch (type) {
        case "p":
          isLegal = this.isPawnMove(fromRow, fromCol, toRow, toCol, pieceColor);
          break;
        case "r":
          isLegal = this.isRookMove(fromRow, fromCol, toRow, toCol);
          break;
        case "n":
          isLegal = this.isKnightMove(fromRow, fromCol, toRow, toCol);
          break;
        case "b":
          isLegal = this.isBishopMove(fromRow, fromCol, toRow, toCol);
          break;
        case "q":
          isLegal = this.isQueenMove(fromRow, fromCol, toRow, toCol);
          break;
        case "k":
          isLegal = this.isKingMove(fromRow, fromCol, toRow, toCol);
          break;
      }
    }

    if (!isLegal) return false;

    if (!testMode) {
      const tempBoard = this.board.map((row) => [...row]);
      this.board[toRow][toCol] = piece;
      this.board[fromRow][fromCol] = null;

      if (this.isInCheck(pieceColor)) {
        this.board = tempBoard;
        return false;
      }

      this.board = tempBoard;
    }

    return true;
  }

  isPawnMove(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === "white" ? -1 : 1;
    const startRow = color === "white" ? 6 : 1;
    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    // Move forward
    if (colDiff === 0) {
      if (rowDiff === direction && !this.board[toRow][toCol]) return true;
      if (
        fromRow === startRow &&
        rowDiff === 2 * direction &&
        !this.board[toRow][toCol] &&
        !this.board[fromRow + direction][fromCol]
      )
        return true;
    }

    // Capture diagonally
    if (colDiff === 1 && rowDiff === direction && this.board[toRow][toCol])
      return true;

    // En passant
    if (this.lastMove && colDiff === 1 && rowDiff === direction) {
      const [lastFrom, lastTo] = this.lastMove;
      if (
        lastTo[0] === fromRow &&
        lastTo[1] === toCol &&
        this.getPieceType(this.board[fromRow][toCol]) === "p" &&
        this.getPieceColor(this.board[fromRow][toCol]) !== color &&
        Math.abs(lastFrom[0] - lastTo[0]) === 2
      )
        return true;
    }

    return false;
  }

  isRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isBishopMove(fromRow, fromCol, toRow, toCol) {
    if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  isQueenMove(fromRow, fromCol, toRow, toCol) {
    return (
      this.isRookMove(fromRow, fromCol, toRow, toCol) ||
      this.isBishopMove(fromRow, fromCol, toRow, toCol)
    );
  }

  isKingMove(fromRow, fromCol, toRow, toCol) {
    // Kings cannot capture each other - they cannot be adjacent to each other
    const targetPiece = this.board[toRow][toCol];
    if (targetPiece && this.getPieceType(targetPiece) === "k") {
      return false; // Cannot move to capture the opponent's king
    }
    return Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1;
  }

  findKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (
          piece &&
          this.getPieceType(piece) === "k" &&
          this.getPieceColor(piece) === color
        ) {
          return [row, col];
        }
      }
    }
    return null;
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
      if (this.board[row][col]) return false;
      row += rowStep;
      col += colStep;
    }

    return true;
  }

  getLegalMoves(row, col) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.isLegalMove(row, col, r, c)) moves.push([r, c]);
      }
    }
    return moves;
  }

  // ============================================
  // CHECK & CHECKMATE
  // ============================================

  findKing(color) {
    const king = color === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === king) return [r, c];
      }
    }
    return null;
  }

  isInCheck(color) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;

    const [kingRow, kingCol] = kingPos;
    const opponentColor = color === "white" ? "black" : "white";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && this.getPieceColor(piece) === opponentColor) {
          if (this.isLegalMove(r, c, kingRow, kingCol, true)) return true;
        }
      }
    }
    return false;
  }

  isCheckmate(color) {
    if (!this.isInCheck(color)) return false;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && this.getPieceColor(piece) === color) {
          if (this.getLegalMoves(r, c).length > 0) return false;
        }
      }
    return true;
  }

  isStalemate(color) {
    if (this.isInCheck(color)) return false;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && this.getPieceColor(piece) === color) {
          if (this.getLegalMoves(r, c).length > 0) return false;
        }
      }
    return true;
  }

  // ============================================
  // MOVE PIECES
  // ============================================

  movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    const pieceColor = this.getPieceColor(piece);

    // CANNOT CAPTURE KING - Only checkmate
    if (captured && this.getPieceType(captured) === "k") {
      return false; // Cannot capture king - must be checkmate
    }

    // Check if target piece is shielded - if so, cannot capture
    if (
      captured &&
      this.shieldedPieces[this.getPieceColor(captured)]?.some(
        (p) => p.row === toRow && p.col === toCol,
      )
    ) {
      // Cannot capture shielded piece
      return false; // Move blocked
    }

    // En passant
    if (this.getPieceType(piece) === "p" && !captured && fromCol !== toCol) {
      const capturedRow = fromRow;
      const capturedPiece = this.board[capturedRow][toCol];
      if (capturedPiece) {
        this.board[capturedRow][toCol] = null;
        const capturedColor = this.getPieceColor(capturedPiece);
        this.capturedPieces[capturedColor].push(capturedPiece);
        this.addEnergy(pieceColor, 1);
        this.stats[pieceColor].captures++;
        this.playSound("capture");
      }
    }

    // Normal capture
    if (captured) {
      const capturedColor = this.getPieceColor(captured);
      this.capturedPieces[capturedColor].push(captured);
      this.stats[pieceColor].captures++;
      this.addEnergy(pieceColor, 1);
      this.playSound("capture");
    }

    // Move
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Pawn promotion
    if (
      this.getPieceType(piece) === "p" &&
      ((pieceColor === "white" && toRow === 0) ||
        (pieceColor === "black" && toRow === 7))
    ) {
      return "promotion";
    }

    // Record move
    this.lastMove = [
      [fromRow, fromCol],
      [toRow, toCol],
    ];
    this.moveHistory.push(this.lastMove);
    this.stats[pieceColor].moves++;

    this.playSound("move");
    return "success";
  }

  // ============================================
  // ENERGY & POWERS
  // ============================================

  addEnergy(color, amount) {
    const energyGain = amount; // يمكن تعديل حسب الشخصية لاحقاً
    this.energy[color] = Math.min(
      this.energy[color] + energyGain,
      this.maxEnergy,
    );
    this.updateEnergyBar();
  }

  canActivatePower(color, power) {
    return this.energy[color] >= this.powersCost[power];
  }

  activatePower(color, power, row = null, col = null) {
    if (!this.canActivatePower(color, power)) return false;
    this.energy[color] -= this.powersCost[power];
    this.stats[color].powersUsed++;
    this.activePowers[color].push(power);
    this.playSound("power");

    switch (power) {
      case "shield":
        return this.activateShield(color, row, col);
      case "double-turn":
        this.doubleMove.active = true;
        this.doubleMove.movesMade = 0;
        return true;
      case "queen-rush":
        this.queenRushActive = true;
        return true;
      case "teleport":
        this.teleportActive = true;
        return true;
    }
    return false;
  }

  activateShield(color, row, col) {
    if (row === null || col === null) return false;
    const piece = this.board[row][col];
    if (!piece || this.getPieceColor(piece) !== color) return false;
    this.shieldedPieces[color].push([row, col]);
    return true;
  }

  // ============================================
  // MOOD
  // ============================================

  updateMood(color) {
    const inCheck = this.isInCheck(color);
    const captureRatio =
      this.stats[color].moves > 0
        ? this.capturedPieces[color].length / this.stats[color].moves
        : 0;

    if (inCheck) this.mood[color] = "😤 Under Pressure";
    else if (captureRatio > 0.3) this.mood[color] = "🔥 Focused";
    else this.mood[color] = "😎 Calm";

    this.renderGameHeader();
  }

  // ============================================
  // RENDERING
  // ============================================

  renderBoard() {
    const boardEl = document.getElementById("chessBoard");
    boardEl.innerHTML = "";

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        square.className = "chess-square";
        square.classList.add((row + col) % 2 === 0 ? "light" : "dark");

        if (
          this.selectedSquare &&
          this.selectedSquare[0] === row &&
          this.selectedSquare[1] === col
        )
          square.classList.add("selected");

        if (this.legalMoves.some((m) => m[0] === row && m[1] === col)) {
          const target = this.board[row][col];
          square.classList.add(target ? "legal-capture" : "legal-move");
        }

        if (this.lastMove) {
          const [from, to] = this.lastMove;
          if (
            (row === from[0] && col === from[1]) ||
            (row === to[0] && col === to[1])
          )
            square.classList.add("last-move");
        }

        const piece = this.board[row][col];
        if (piece) {
          const pieceEl = document.createElement("div");
          pieceEl.className = "chess-piece";
          pieceEl.classList.add(
            this.getPieceColor(piece) === "white"
              ? "white-piece"
              : "black-piece",
          );
          pieceEl.textContent = this.getPieceUnicode(piece);

          if (
            this.shieldedPieces[this.getPieceColor(piece)]?.some(
              (p) => p[0] === row && p[1] === col,
            )
          )
            pieceEl.classList.add("shielded");

          square.appendChild(pieceEl);
        }

        // set coords for later selection/animation
        square.dataset.row = row;
        square.dataset.col = col;

        // Use Pointer Events when available (unified mouse + touch). Fallback to touch + click.
        if (window.PointerEvent) {
          square.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            this.handleSquareClick(row, col);
          });
        } else {
          square.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.handleSquareClick(row, col);
          });
          square.addEventListener("click", () =>
            this.handleSquareClick(row, col),
          );
        }

        boardEl.appendChild(square);
      }
    }

    // Briefly add a 'moved' class to the destination square for a smooth animation
    if (this.lastMove) {
      try {
        const [, to] = this.lastMove;
        const selector = `[data-row="${to[0]}"][data-col="${to[1]}"]`;
        const toEl = boardEl.querySelector(selector);
        if (toEl) {
          toEl.classList.add("moved");
          setTimeout(() => toEl.classList.remove("moved"), 350);
        }
      } catch (e) {
        // ignore any render-time issues
      }
    }
  }

  renderGameHeader() {
    const whiteTimerDisplay = document.querySelector(
      ".white-timer .timer-display",
    );
    const blackTimerDisplay = document.querySelector(
      ".black-timer .timer-display",
    );
    const whiteMoodDisplay = document.querySelector(
      ".white-timer .mood-indicator",
    );
    const blackMoodDisplay = document.querySelector(
      ".black-timer .mood-indicator",
    );
    const turnIndicator = document.querySelector(".turn-indicator");

    whiteTimerDisplay.textContent = this.formatTime(this.whiteTime);
    blackTimerDisplay.textContent = this.formatTime(this.blackTime);
    whiteMoodDisplay.textContent = this.mood.white;
    blackMoodDisplay.textContent = this.mood.black;
    turnIndicator.textContent = `${this.currentPlayer === "white" ? "DINA" : "Ola"}'S TURN`;
    turnIndicator.style.color =
      this.currentPlayer === "white" ? "#d4af37" : "#b8860b";
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  playSound(type) {
    if (!this.soundEnabled) {
      console.log("Sound is disabled");
      return;
    }
    const sounds = {
      move: "moveSound",
      capture: "captureSound",
      power: "powerSound",
    };
    const audio = document.getElementById(sounds[type]);
    console.log(`Attempting to play sound: ${type} -> ID: ${sounds[type]}`);
    if (audio) {
      audio.muted = false;
      audio.currentTime = 0;
      console.log(`Audio element found, playing...`);
      audio.play().catch((error) => {
        console.log(`Failed to play ${type}:`, error);
      });
    } else {
      console.log(`Audio element NOT found: ${sounds[type]}`);
    }
  }

  getPieceUnicode(piece) {
    const map = {
      p: "♟",
      P: "♙",
      r: "♜",
      R: "♖",
      n: "♞",
      N: "♘",
      b: "♝",
      B: "♗",
      q: "♛",
      Q: "♕",
      k: "♚",
      K: "♔",
    };
    return map[piece] || "";
  }

  updateEnergyBar() {
    // Update energy fill bar
    const energyFill = document.getElementById("energyFill");
    const energyCount = document.getElementById("energyCount");
    if (energyFill && energyCount) {
      const percentage =
        (this.energy[this.currentPlayer] / this.maxEnergy) * 100;
      energyFill.style.width = percentage + "%";
      energyCount.textContent = `${Math.floor(this.energy[this.currentPlayer])} / ${this.maxEnergy}`;
    }

    // Update stats
    this.updateStats();
  }

  updateStats() {
    // Update Dina's stats (white)
    const whiteMoves = document.getElementById("whiteMoves");
    const whiteCaptures = document.getElementById("whiteCaptures");
    const whitePowers = document.getElementById("whitePowers");

    if (whiteMoves) whiteMoves.textContent = this.stats.white.moves;
    if (whiteCaptures) whiteCaptures.textContent = this.stats.white.captures;
    if (whitePowers) whitePowers.textContent = this.stats.white.powersUsed;

    // Update Ola's stats (black)
    const blackMoves = document.getElementById("blackMoves");
    const blackCaptures = document.getElementById("blackCaptures");
    const blackPowers = document.getElementById("blackPowers");

    if (blackMoves) blackMoves.textContent = this.stats.black.moves;
    if (blackCaptures) blackCaptures.textContent = this.stats.black.captures;
    if (blackPowers) blackPowers.textContent = this.stats.black.powersUsed;
  }

  // ============================================
  // SQUARE CLICK HANDLER
  // ============================================

  handleSquareClick(row, col) {
    const piece = this.board[row][col];

    // SHIELD POWER - Select piece to protect
    if (this.shieldMode) {
      if (piece && this.getPieceColor(piece) === this.currentPlayer) {
        // Activate shield on this piece (energy already deducted in handlePowerClick)
        this.shieldedPieces[this.currentPlayer].push({ row, col });
        this.shieldMode = false;
        this.selectedSquare = null;

        // Visual feedback - add highlight
        this.board[row][col] = piece; // Force rerender
        this.renderBoard();

        // Show message
        const pieceName = this.getPieceType(piece).toUpperCase();
        this.addChatMessage(
          "System",
          `🛡️ ${this.currentPlayer} protected ${pieceName}!`,
        );

        this.switchPlayer();
        this.updateEnergyBar();
      }
      return;
    }

    // QUEEN RUSH POWER
    if (this.queenRushActive && this.selectedSquare) {
      const [fromRow, fromCol] = this.selectedSquare;
      if (this.isLegalMove(fromRow, fromCol, row, col)) {
        this.movePiece(fromRow, fromCol, row, col);
      }
      this.queenRushActive = false;
      this.selectedSquare = null;
      this.switchPlayer();
      this.renderBoard();
      this.updateEnergyBar();
      return;
    }

    // TELEPORT POWER
    if (this.teleportActive && this.selectedSquare) {
      const [fromRow, fromCol] = this.selectedSquare;
      // Can only teleport to empty square or capture opponent piece
      if (!piece || this.getPieceColor(piece) !== this.currentPlayer) {
        const teleportPiece = this.board[fromRow][fromCol];
        const targetPiece = this.board[row][col];

        // Capture if needed
        if (targetPiece) {
          const capturedColor = this.getPieceColor(targetPiece);
          this.capturedPieces[capturedColor].push(targetPiece);
          this.stats[this.currentPlayer].captures++;
          this.addEnergy(this.currentPlayer, 1);
          this.playSound("capture");
        }

        this.board[row][col] = teleportPiece;
        this.board[fromRow][fromCol] = null;
        this.lastMove = [
          [fromRow, fromCol],
          [row, col],
        ];
        this.moveHistory.push(this.lastMove);
        this.stats[this.currentPlayer].moves++;
        this.playSound("move");

        this.teleportActive = false;
        this.selectedSquare = null;
        this.switchPlayer();

        // Check for end game
        const playerToMove = this.currentPlayer;
        const opponent = playerToMove === "white" ? "black" : "white";
        if (this.isCheckmate(playerToMove)) {
          this.endGame(opponent);
          this.renderBoard();
          this.updateEnergyBar();
          return;
        }
        if (this.isStalemate(playerToMove)) {
          this.endGame("draw");
          this.renderBoard();
          this.updateEnergyBar();
          return;
        }

        this.updateMood("white");
        this.updateMood("black");
        this.renderBoard();
        this.updateEnergyBar();
      }
      return;
    }

    if (piece && this.getPieceColor(piece) === this.currentPlayer) {
      this.selectedSquare = [row, col];
      this.legalMoves = this.getLegalMoves(row, col);
    } else if (this.selectedSquare) {
      const [fromRow, fromCol] = this.selectedSquare;
      if (this.isLegalMove(fromRow, fromCol, row, col)) {
        const result = this.movePiece(fromRow, fromCol, row, col);

        // If movePiece returns false (e.g., shielded piece), the move is blocked
        if (result === false) {
          this.addChatMessage("System", "🛡️ That piece is protected!");
          this.selectedSquare = [fromRow, fromCol];
          this.legalMoves = this.getLegalMoves(fromRow, fromCol);
          this.renderBoard();
          return;
        }

        this.selectedSquare = null;
        this.legalMoves = [];

        if (result === "promotion") {
          // Show promotion modal instead of auto-promoting
          this.promotionData = { row, col };
          document.getElementById("promotionModal").classList.remove("hidden");
          this.updateMood("white");
          this.updateMood("black");
          this.renderBoard();
          this.updateEnergyBar();
          return; // Wait for player to choose piece
        }

        if (!this.doubleMove.active) this.switchPlayer();
        else this.doubleMove.movesMade++;

        if (this.doubleMove.active && this.doubleMove.movesMade >= 2) {
          this.doubleMove.active = false;
          this.doubleMove.movesMade = 0;
          this.switchPlayer();
        }

        // After the move and any player switching, check for checkmate or stalemate
        // The `currentPlayer` now references the player to move. If that player
        // is checkmated, the previous mover is the winner.
        const playerToMove = this.currentPlayer;
        const opponent = playerToMove === "white" ? "black" : "white";

        if (this.isCheckmate(playerToMove)) {
          // opponent delivered checkmate
          this.endGame(opponent);
          this.renderBoard();
          this.updateEnergyBar();
          return;
        }

        if (this.isStalemate(playerToMove)) {
          // draw by stalemate
          this.endGame("draw");
          this.renderBoard();
          this.updateEnergyBar();
          return;
        }
      }
    }

    this.updateMood("white");
    this.updateMood("black");
    this.renderBoard();
    this.updateEnergyBar();
  }

  // ============================================
  // PLAYER MANAGEMENT
  // ============================================

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === "white" ? "black" : "white";
    this.updateEnergyBar();
    this.renderGameHeader();
  }

  initializeEventListeners() {
    // START GAME BUTTON
    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startGame());
    }

    // TIME SELECTION
    document.querySelectorAll(".time-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".time-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.timeLimit = parseInt(e.target.dataset.time) * 60;
        this.whiteTime = this.timeLimit;
        this.blackTime = this.timeLimit;
      });
    });

    // Personality selection removed (disabled)

    // SOUND TOGGLE
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) {
      soundToggle.addEventListener("click", () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.textContent = this.soundEnabled ? "🔊" : "🔇";
      });
    }

    // CHAT FEATURES
    const sendMsg = document.getElementById("sendMsg");
    const chatInput = document.getElementById("chatInput");
    if (sendMsg) {
      sendMsg.addEventListener("click", () => this.sendMessage());
    }
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendMessage();
      });
    }

    // EMOJI REACTIONS
    document.querySelectorAll(".emoji-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.addEmoji(e.target.dataset.emoji);
      });
    });

    // POWER BUTTONS
    document.querySelectorAll(".power-item").forEach((item) => {
      item.addEventListener("click", () => this.handlePowerClick(item));
    });

    // COMBO BUTTON
    const comboBtn = document.getElementById("comboBtn");
    if (comboBtn) {
      comboBtn.addEventListener("click", () => this.activateCombo());
    }

    // FORFEIT BUTTON
    const forfeitBtn = document.getElementById("forfeitBtn");
    if (forfeitBtn) {
      forfeitBtn.addEventListener("click", () => this.endGame("opponent"));
    }

    // END GAME BUTTONS
    const rematchBtn = document.getElementById("rematchBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    if (rematchBtn) {
      rematchBtn.addEventListener("click", () => this.rematch());
    }
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => this.returnToSetup());
    }

    // DEBUG BUTTONS (for local testing)
    const debugCheckBtn = document.getElementById("debugCheckBtn");
    const debugForceEndBtn = document.getElementById("debugForceEndBtn");
    if (debugCheckBtn) {
      debugCheckBtn.addEventListener("click", () => this.runCheckDetection());
    }
    if (debugForceEndBtn) {
      debugForceEndBtn.addEventListener("click", () => this.endGame("white"));
    }

    // PROMOTION MODAL
    document.querySelectorAll(".promotion-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.promotePawn(e.target.dataset.piece),
      );
    });
  }

  // ============================================
  // GAME FLOW
  // ============================================

  startGame() {
    this.gameState = "playing";
    document.getElementById("startScreen").classList.remove("active");
    document.getElementById("gameScreen").classList.add("active");
    this.renderBoard();
    this.renderGameHeader();
    this.updateEnergyBar();
    this.startTimer();
  }

  endGame(winner) {
    this.gameState = "ended";
    clearInterval(this.timerInterval);
    const endScreen = document.getElementById("endScreen");
    const endContent = document.getElementById("endContent");
    if (endScreen) {
      endScreen.classList.add("active");
      document.getElementById("gameScreen").classList.remove("active");

      // Compose end message
      let title = "Game Over";
      let details = "";
      if (winner === "draw") {
        title = "Stalemate — Draw";
        details = "No legal moves available. It's a draw.";
      } else if (winner === "opponent") {
        // If 'opponent' used, winner is the opposite of currentPlayer
        const winColor = this.currentPlayer === "white" ? "black" : "white";
        title = `${this.players[winColor].name} WINS by Forfeit`;
      } else if (winner === "white" || winner === "black") {
        title = `${this.players[winner].name} WINS!`;
      }

      if (endContent) {
        endContent.innerHTML = `
          <h2>${title}</h2>
          <p>${details}</p>
          <div class="end-stats">
            <div>Dina Moves: ${this.stats.white.moves} | Captures: ${this.stats.white.captures}</div>
            <div>Ola Moves: ${this.stats.black.moves} | Captures: ${this.stats.black.captures}</div>
          </div>
        `;
      }
    }
  }

  rematch() {
    this.board = this.initBoard();
    this.currentPlayer = "white";
    this.selectedSquare = null;
    this.legalMoves = [];
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.energy = { white: 0, black: 0 };
    this.stats = {
      white: { moves: 0, captures: 0, powersUsed: 0 },
      black: { moves: 0, captures: 0, powersUsed: 0 },
    };
    this.whiteTime = this.timeLimit;
    this.blackTime = this.timeLimit;
    this.gameState = "playing";

    document.getElementById("endScreen").classList.remove("active");
    document.getElementById("gameScreen").classList.add("active");

    this.renderBoard();
    this.renderGameHeader();
    this.updateEnergyBar();
    this.startTimer();
  }

  returnToSetup() {
    this.gameState = "setup";
    document.getElementById("endScreen").classList.remove("active");
    document.getElementById("startScreen").classList.add("active");
  }

  // ============================================
  // CHAT & MESSAGING
  // ============================================

  sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    const chatBox = document.getElementById("chatBox");
    const messageEl = document.createElement("div");
    messageEl.className = `chat-message ${this.currentPlayer}-player`;
    messageEl.innerHTML = `
      <div class="message-author">${this.currentPlayer === "white" ? "Dina ♕" : "Ola ♔"}</div>
      <div>${message}</div>
    `;
    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
    input.value = "";
  }

  addChatMessage(author, message) {
    const chatBox = document.getElementById("chatBox");
    const messageEl = document.createElement("div");
    messageEl.className = `chat-message ${author === "System" ? "system" : this.currentPlayer}-player`;
    messageEl.innerHTML = `
      <div class="message-author">${author}</div>
      <div>${message}</div>
    `;
    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  addEmoji(emoji) {
    const chatBox = document.getElementById("chatBox");
    const messageEl = document.createElement("div");
    messageEl.className = `chat-message ${this.currentPlayer}-player`;
    messageEl.innerHTML = `
      <div class="message-author">${this.currentPlayer === "white" ? "Dina ♕" : "Ola ♔"}</div>
      <div>${emoji}</div>
    `;
    chatBox.appendChild(messageEl);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ============================================
  // POWERS
  // ============================================

  handlePowerClick(item) {
    const power = item.dataset.power;
    if (this.canActivatePower(this.currentPlayer, power)) {
      // تشغيل الصوت مباشرة
      const powerSound = document.getElementById("powerSound");
      if (powerSound) {
        powerSound.muted = false;
        powerSound.currentTime = 0;
        powerSound.play().catch((e) => console.log("Audio play error:", e));
      }

      // Shield requires piece selection
      if (power === "shield") {
        this.shieldMode = true;
        this.addChatMessage(
          "System",
          `🛡️ ${this.currentPlayer === "white" ? "Dina" : "Ola"} activated Shield! Click a piece to protect it.`,
        );
        // Deduct energy for shield upfront
        this.energy[this.currentPlayer] -= this.powersCost[power];
        this.stats[this.currentPlayer].powersUsed++;
        this.updateEnergyBar();
        return;
      }

      // Queen Rush power
      if (power === "queen-rush") {
        this.queenRushActive = true;
        this.addChatMessage(
          "System",
          `👑 ${this.currentPlayer === "white" ? "Dina" : "Ola"} activated Queen Rush! All pieces move like queens this turn.`,
        );
        this.activatePower(this.currentPlayer, power);
        item.classList.add("active");
        setTimeout(() => item.classList.remove("active"), 1000);
        this.updateEnergyBar();
        return;
      }

      // Double Turn and Teleport
      const powerMessages = {
        "double-turn": `⚡ ${this.currentPlayer === "white" ? "Dina" : "Ola"} activated Double Turn! You get 2 moves.`,
        teleport: `🌀 ${this.currentPlayer === "white" ? "Dina" : "Ola"} activated Teleport! Select a piece then click anywhere to teleport.`,
      };

      if (powerMessages[power]) {
        this.addChatMessage("System", powerMessages[power]);
      }

      this.activatePower(this.currentPlayer, power);
      item.classList.add("active");
      setTimeout(() => item.classList.remove("active"), 1000);
      this.updateEnergyBar();
    } else {
      // Not enough energy
      const playerName = this.currentPlayer === "white" ? "Dina" : "Ola";
      const cost = this.powersCost[power];
      this.addChatMessage(
        "System",
        `❌ ${playerName} needs ${cost} energy (current: ${this.energy[this.currentPlayer]})`,
      );
    }
  }

  canActivatePower(color, power) {
    const cost = this.powersCost[power];
    return this.energy[color] >= cost;
  }

  activatePower(color, power) {
    const cost = this.powersCost[power];
    this.energy[color] -= cost;
    this.stats[color].powersUsed++;

    switch (power) {
      case "queen-rush":
        this.queenRushActive = true;
        break;
      case "double-turn":
        this.doubleMove.active = true;
        this.doubleMove.movesMade = 0;
        break;
      case "teleport":
        this.teleportActive = true;
        break;
      case "shield":
        // Shield power - select a piece to protect
        break;
    }
  }

  activateCombo() {
    const comboEnergyCost = 6;
    const playerName = this.currentPlayer === "white" ? "Dina" : "Ola";

    if (this.energy[this.currentPlayer] >= comboEnergyCost) {
      this.energy[this.currentPlayer] -= comboEnergyCost;
      this.stats[this.currentPlayer].powersUsed += 2;

      // Activate both Double Turn and Queen Rush
      this.doubleMove.active = true;
      this.doubleMove.movesMade = 0;
      this.queenRushActive = true;

      this.addChatMessage(
        "System",
        `💥 ${playerName} activated COMBO POWER! Double Turn + Queen Rush combined! All pieces move like queens for 2 turns.`,
      );

      const comboBtn = document.getElementById("comboBtn");
      if (comboBtn) {
        comboBtn.classList.add("active");
        setTimeout(() => comboBtn.classList.remove("active"), 1000);
      }

      this.updateEnergyBar();
    } else {
      const needed = comboEnergyCost - this.energy[this.currentPlayer];
      this.addChatMessage(
        "System",
        `❌ ${playerName} needs ${comboEnergyCost} energy for Combo Power (${needed} more needed)`,
      );
    }
  }

  // ============================================
  // PAWN PROMOTION
  // ============================================

  promotePawn(piece) {
    if (this.promotionData) {
      const { row, col } = this.promotionData;
      const color = this.getPieceColor(this.board[row][col]);
      const newPiece =
        color === "white" ? piece.toUpperCase() : piece.toLowerCase();
      this.board[row][col] = newPiece;
      document.getElementById("promotionModal").classList.add("hidden");
      this.promotionData = null;

      // Continue with game flow after promotion
      if (!this.doubleMove.active) this.switchPlayer();
      else this.doubleMove.movesMade++;

      if (this.doubleMove.active && this.doubleMove.movesMade >= 2) {
        this.doubleMove.active = false;
        this.doubleMove.movesMade = 0;
        this.switchPlayer();
      }

      // Check for checkmate or stalemate after promotion
      const playerToMove = this.currentPlayer;
      const opponent = playerToMove === "white" ? "black" : "white";

      if (this.isCheckmate(playerToMove)) {
        this.endGame(opponent);
        this.renderBoard();
        this.updateEnergyBar();
        return;
      }

      if (this.isStalemate(playerToMove)) {
        this.endGame("draw");
        this.renderBoard();
        this.updateEnergyBar();
        return;
      }

      this.updateMood("white");
      this.updateMood("black");
      this.renderBoard();
      this.updateEnergyBar();
    }
  }

  // ============================================
  // DEBUG / TEST HELPERS
  // ============================================
  runCheckDetection() {
    // Check both players for checkmate or stalemate and act accordingly
    if (this.isCheckmate("white")) {
      this.addChatMessage("System", "Checkmate detected: White is checkmated.");
      this.endGame("black");
      return;
    }
    if (this.isCheckmate("black")) {
      this.addChatMessage("System", "Checkmate detected: Black is checkmated.");
      this.endGame("white");
      return;
    }
    if (this.isStalemate("white") || this.isStalemate("black")) {
      this.addChatMessage("System", "Stalemate detected: Draw.");
      this.endGame("draw");
      return;
    }
    this.addChatMessage("System", "No checkmate or stalemate detected.");
  }

  // ============================================
  // TIMER
  // ============================================

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.currentPlayer === "white") {
        this.whiteTime--;
        if (this.whiteTime <= 0) {
          this.endGame("black");
        }
      } else {
        this.blackTime--;
        if (this.blackTime <= 0) {
          this.endGame("white");
        }
      }
      this.renderGameHeader();
    }, 1000);
  }

  playSound(type) {
    if (!this.soundEnabled) {
      console.log("Sound is disabled");
      return;
    }
    const sounds = {
      move: "moveSound",
      capture: "captureSound",
      power: "powerSound",
    };
    const audio = document.getElementById(sounds[type]);
    console.log(`Attempting to play sound: ${type} -> ID: ${sounds[type]}`);
    if (audio) {
      audio.muted = false;
      audio.currentTime = 0;
      console.log(`Audio element found, playing...`);
      audio.play().catch((error) => {
        console.log(`Failed to play ${type}:`, error);
      });
    } else {
      console.log(`Audio element NOT found: ${sounds[type]}`);
    }
  }
}

const game = new ChessGame();
game.renderBoard();
game.renderGameHeader();
game.updateEnergyBar();
