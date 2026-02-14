// Battleships Forever - HTML5 Edition
// Game Logic

class BattleshipsGame {
    constructor() {
        this.boardSize = 10;
        this.ships = {
            carrier: { name: 'Carrier', size: 5, icon: '🚢' },
            battleship: { name: 'Battleship', size: 4, icon: '🚢' },
            cruiser: { name: 'Cruiser', size: 3, icon: '🚤' },
            submarine: { name: 'Submarine', size: 3, icon: '🛥️' },
            destroyer: { name: 'Destroyer', size: 2, icon: '⛵' }
        };
        
        this.playerBoard = this.createBoard();
        this.enemyBoard = this.createBoard();
        this.playerShips = [];
        this.enemyShips = [];
        this.currentShip = null;
        this.isHorizontal = true;
        this.gameStarted = false;
        this.isPlayerTurn = true;
        this.shotsFired = 0;
        this.hits = 0;
        
        this.initializeUI();
        this.placeEnemyShips();
    }
    
    createBoard() {
        const board = [];
        for (let i = 0; i < this.boardSize; i++) {
            board[i] = [];
            for (let j = 0; j < this.boardSize; j++) {
                board[i][j] = {
                    hasShip: false,
                    isHit: false,
                    shipId: null
                };
            }
        }
        return board;
    }
    
    initializeUI() {
        this.createBoardUI('player-board', true);
        this.createBoardUI('enemy-board', false);
        this.setupEventListeners();
        this.updateShipList();
    }
    
    createBoardUI(boardId, isPlayerBoard) {
        const boardElement = document.getElementById(boardId);
        boardElement.innerHTML = '';
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.board = isPlayerBoard ? 'player' : 'enemy';
                
                if (isPlayerBoard) {
                    cell.addEventListener('mouseenter', (e) => this.handleCellHover(e));
                    cell.addEventListener('mouseleave', (e) => this.handleCellLeave(e));
                    cell.addEventListener('click', (e) => this.handleCellClick(e));
                } else {
                    cell.addEventListener('click', (e) => this.handleEnemyBoardClick(e));
                }
                
                boardElement.appendChild(cell);
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('rotate-btn').addEventListener('click', () => {
            this.isHorizontal = !this.isHorizontal;
            this.updateStatusMessage(`Ship orientation: ${this.isHorizontal ? 'Horizontal' : 'Vertical'}`);
        });
        
        document.getElementById('random-btn').addEventListener('click', () => {
            this.randomPlacement();
        });
        
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('play-again-btn').addEventListener('click', () => {
            location.reload();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.isHorizontal = !this.isHorizontal;
                this.updateStatusMessage(`Ship orientation: ${this.isHorizontal ? 'Horizontal' : 'Vertical'}`);
            }
        });
        
        // Ship selection
        document.querySelectorAll('.ship-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const shipType = e.currentTarget.dataset.ship;
                if (!e.currentTarget.classList.contains('placed')) {
                    this.currentShip = shipType;
                    document.querySelectorAll('.ship-item').forEach(i => i.classList.remove('selected'));
                    e.currentTarget.classList.add('selected');
                    this.updateStatusMessage(`Selected ${this.ships[shipType].name}. Click on the board to place it.`);
                }
            });
        });
    }
    
    handleCellHover(e) {
        if (!this.currentShip || this.gameStarted) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const size = this.ships[this.currentShip].size;
        
        const cells = this.getCellsForShip(row, col, size);
        const isValid = this.canPlaceShip(row, col, size);
        
        cells.forEach(([r, c]) => {
            const cell = document.querySelector(`#player-board .cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add(isValid ? 'hover-preview' : 'hover-invalid');
            }
        });
    }
    
    handleCellLeave(e) {
        document.querySelectorAll('#player-board .cell').forEach(cell => {
            cell.classList.remove('hover-preview', 'hover-invalid');
        });
    }
    
    handleCellClick(e) {
        if (!this.currentShip || this.gameStarted) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (this.placeShip(row, col, this.currentShip)) {
            document.querySelector(`.ship-item[data-ship="${this.currentShip}"]`).classList.add('placed');
            this.currentShip = null;
            document.querySelectorAll('.ship-item').forEach(i => i.classList.remove('selected'));
            
            if (this.playerShips.length === Object.keys(this.ships).length) {
                document.getElementById('start-btn').disabled = false;
                this.updateStatusMessage('All ships placed! Click "Start Battle" to begin.');
            } else {
                this.updateStatusMessage('Select another ship to place.');
            }
        }
    }
    
    getCellsForShip(row, col, size) {
        const cells = [];
        for (let i = 0; i < size; i++) {
            if (this.isHorizontal) {
                cells.push([row, col + i]);
            } else {
                cells.push([row + i, col]);
            }
        }
        return cells;
    }
    
    canPlaceShip(row, col, size) {
        const cells = this.getCellsForShip(row, col, size);
        
        for (const [r, c] of cells) {
            if (r < 0 || r >= this.boardSize || c < 0 || c >= this.boardSize) {
                return false;
            }
            if (this.playerBoard[r][c].hasShip) {
                return false;
            }
        }
        
        return true;
    }
    
    placeShip(row, col, shipType) {
        const size = this.ships[shipType].size;
        
        if (!this.canPlaceShip(row, col, size)) {
            this.updateStatusMessage('Cannot place ship here!');
            return false;
        }
        
        const shipId = `player-${shipType}-${Date.now()}`;
        const cells = this.getCellsForShip(row, col, size);
        
        cells.forEach(([r, c]) => {
            this.playerBoard[r][c].hasShip = true;
            this.playerBoard[r][c].shipId = shipId;
            
            const cell = document.querySelector(`#player-board .cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add('ship');
            }
        });
        
        this.playerShips.push({
            id: shipId,
            type: shipType,
            cells: cells,
            hits: 0
        });
        
        return true;
    }
    
    placeEnemyShips() {
        Object.keys(this.ships).forEach(shipType => {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.boardSize);
                const col = Math.floor(Math.random() * this.boardSize);
                const horizontal = Math.random() < 0.5;
                
                const tempHorizontal = this.isHorizontal;
                this.isHorizontal = horizontal;
                
                if (this.canPlaceShipOnBoard(this.enemyBoard, row, col, this.ships[shipType].size)) {
                    const shipId = `enemy-${shipType}-${Date.now()}`;
                    const cells = this.getCellsForShip(row, col, this.ships[shipType].size);
                    
                    cells.forEach(([r, c]) => {
                        this.enemyBoard[r][c].hasShip = true;
                        this.enemyBoard[r][c].shipId = shipId;
                    });
                    
                    this.enemyShips.push({
                        id: shipId,
                        type: shipType,
                        cells: cells,
                        hits: 0
                    });
                    
                    placed = true;
                }
                
                this.isHorizontal = tempHorizontal;
                attempts++;
            }
        });
    }
    
    canPlaceShipOnBoard(board, row, col, size) {
        const cells = this.getCellsForShip(row, col, size);
        
        for (const [r, c] of cells) {
            if (r < 0 || r >= this.boardSize || c < 0 || c >= this.boardSize) {
                return false;
            }
            if (board[r][c].hasShip) {
                return false;
            }
        }
        
        return true;
    }
    
    randomPlacement() {
        // Clear current ships
        this.playerShips = [];
        this.playerBoard = this.createBoard();
        
        Object.keys(this.ships).forEach(shipType => {
            let placed = false;
            let attempts = 0;
            
            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * this.boardSize);
                const col = Math.floor(Math.random() * this.boardSize);
                this.isHorizontal = Math.random() < 0.5;
                
                if (this.placeShip(row, col, shipType)) {
                    placed = true;
                }
                
                attempts++;
            }
        });
        
        document.querySelectorAll('.ship-item').forEach(item => {
            item.classList.add('placed');
        });
        
        document.getElementById('start-btn').disabled = false;
        this.updateStatusMessage('Ships randomly placed! Click "Start Battle" to begin.');
    }
    
    startGame() {
        this.gameStarted = true;
        document.getElementById('rotate-btn').disabled = true;
        document.getElementById('random-btn').disabled = true;
        document.getElementById('start-btn').disabled = true;
        document.querySelector('.ships-to-place').style.display = 'none';
        
        this.updateStatusMessage('Battle has begun! Click on enemy waters to fire.');
        document.getElementById('game-status').textContent = 'Your Turn';
    }
    
    handleEnemyBoardClick(e) {
        if (!this.gameStarted || !this.isPlayerTurn) return;
        
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        
        if (this.enemyBoard[row][col].isHit) {
            this.updateStatusMessage('You already fired at this location!');
            return;
        }
        
        this.playerFire(row, col);
    }
    
    playerFire(row, col) {
        this.shotsFired++;
        this.updateStats();
        
        const cell = this.enemyBoard[row][col];
        cell.isHit = true;
        
        const cellElement = document.querySelector(`#enemy-board .cell[data-row="${row}"][data-col="${col}"]`);
        
        if (cell.hasShip) {
            this.hits++;
            cellElement.classList.add('hit');
            
            // Find the ship and update hits
            const ship = this.enemyShips.find(s => s.id === cell.shipId);
            if (ship) {
                ship.hits++;
                
                if (ship.hits === this.ships[ship.type].size) {
                    // Ship is sunk
                    this.updateStatusMessage(`You sank the enemy ${this.ships[ship.type].name}! 💥`);
                    this.markShipAsSunk(ship, 'enemy');
                    
                    const remainingShips = this.enemyShips.filter(s => s.hits < this.ships[s.type].size).length;
                    
                    if (remainingShips === 0) {
                        this.endGame(true);
                        return;
                    }
                } else {
                    this.updateStatusMessage('Direct hit! 💥');
                }
            }
        } else {
            cellElement.classList.add('miss');
            this.updateStatusMessage('Miss! 🌊');
        }
        
        this.isPlayerTurn = false;
        document.getElementById('game-status').textContent = 'Enemy Turn';
        
        setTimeout(() => {
            this.enemyTurn();
        }, 1000);
    }
    
    enemyTurn() {
        let row, col;
        let attempts = 0;
        
        // Simple AI: random shots
        do {
            row = Math.floor(Math.random() * this.boardSize);
            col = Math.floor(Math.random() * this.boardSize);
            attempts++;
        } while (this.playerBoard[row][col].isHit && attempts < 100);
        
        const cell = this.playerBoard[row][col];
        cell.isHit = true;
        
        const cellElement = document.querySelector(`#player-board .cell[data-row="${row}"][data-col="${col}"]`);
        
        if (cell.hasShip) {
            cellElement.classList.add('hit');
            
            const ship = this.playerShips.find(s => s.id === cell.shipId);
            if (ship) {
                ship.hits++;
                
                if (ship.hits === this.ships[ship.type].size) {
                    this.updateStatusMessage(`Enemy sank your ${this.ships[ship.type].name}! 😱`);
                    this.markShipAsSunk(ship, 'player');
                    
                    const remainingShips = this.playerShips.filter(s => s.hits < this.ships[s.type].size).length;
                    
                    if (remainingShips === 0) {
                        this.endGame(false);
                        return;
                    }
                } else {
                    this.updateStatusMessage('Enemy hit your ship! 💥');
                }
            }
        } else {
            cellElement.classList.add('miss');
            this.updateStatusMessage('Enemy missed! 🌊');
        }
        
        this.isPlayerTurn = true;
        document.getElementById('game-status').textContent = 'Your Turn';
        this.updateStats();
    }
    
    markShipAsSunk(ship, boardType) {
        ship.cells.forEach(([r, c]) => {
            const cellElement = document.querySelector(`#${boardType}-board .cell[data-row="${r}"][data-col="${c}"]`);
            if (cellElement) {
                cellElement.classList.add('sunk');
            }
        });
    }
    
    updateStats() {
        const playerShipsRemaining = this.playerShips.filter(s => s.hits < this.ships[s.type].size).length;
        const enemyShipsRemaining = this.enemyShips.filter(s => s.hits < this.ships[s.type].size).length;
        
        document.getElementById('player-ships').textContent = playerShipsRemaining;
        document.getElementById('enemy-ships').textContent = enemyShipsRemaining;
        document.getElementById('shots-fired').textContent = this.shotsFired;
    }
    
    updateStatusMessage(message) {
        document.getElementById('game-message').textContent = message;
    }
    
    updateShipList() {
        // Initial ship list is already in HTML
    }
    
    endGame(playerWon) {
        this.gameStarted = false;
        
        document.getElementById('game-over-title').textContent = playerWon ? '🎉 Victory! 🎉' : '💀 Defeat 💀';
        document.getElementById('game-over-message').textContent = playerWon 
            ? 'Congratulations! You sank all enemy ships!' 
            : 'All your ships have been sunk. Better luck next time!';
        
        document.getElementById('final-shots').textContent = this.shotsFired;
        const accuracy = this.shotsFired > 0 ? ((this.hits / this.shotsFired) * 100).toFixed(1) : 0;
        document.getElementById('final-accuracy').textContent = accuracy + '%';
        
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('active');
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new BattleshipsGame();
});
