// Game class - handles game logic
class Game {
    constructor(settings, ui) {
        this.settings = settings;
        this.ui = ui;
        
        this.monsterHP = 5000;
        this.maxHP = 5000;
        this.gameActive = false;
        this.isHovering = false;
        this.difficulty = '';
        this.failThreshold = 0;
        this.speedIncreaseThreshold = 0;
        this.bigDamageChance = 0;
        this.bigDamageMinHP = 0;
        
        this.difficultySettings = {
            easy: {
                failThreshold: 0,
                speedIncreaseThreshold: 0,
                bigDamageChance: 0,
                bigDamageMinHP: 0
            },
            normal: {
                failThreshold: 1000,
                speedIncreaseThreshold: 2000,
                bigDamageChance: 0,
                bigDamageMinHP: 0
            },
            hard: {
                failThreshold: 1000,
                speedIncreaseThreshold: 2000,
                bigDamageChance: 0.2, // 20% chance of big damage
                bigDamageMinHP: 1400
            }
        };
    }
    
    startGame(selectedDifficulty) {
        this.difficulty = selectedDifficulty;
        
        // Set difficulty parameters
        const settings = this.difficultySettings[selectedDifficulty];
        this.failThreshold = settings.failThreshold;
        this.speedIncreaseThreshold = settings.speedIncreaseThreshold;
        this.bigDamageChance = settings.bigDamageChance;
        this.bigDamageMinHP = settings.bigDamageMinHP;
        
        // Update current difficulty display
        this.ui.updateCurrentDifficulty(this.difficulty.toUpperCase());
        
        // Hide start screen and start game
        this.ui.hideStartScreen();
        this.initGame();
    }
    
    initGame() {
        // Hide game message when starting a new game
        this.ui.hideGameMessage();
        this.ui.hideThresholdWarning();
        
        // Reset monster opacity and remove fading class
        this.ui.resetMonsterOpacity();
        
        this.monsterHP = this.maxHP;
        this.gameActive = true;
        this.ui.updateHealthBar(this.monsterHP, this.maxHP);
        this.ui.updateBestScoresDisplay(this.settings.getBestScores(this.difficulty));
        this.ui.updateCurrentScore('-');
        
        // Start decreasing monster HP
        this.decreaseHP();
    }
    
    decreaseHP() {
        if (!this.gameActive) return;
        
        // Calculate decrease amount and next decrease time
        let decreaseAmount = Math.random() * 100 + 50;
        let nextDecreaseTime = Math.random() * 400 + 200;
        
        // Apply speed increase if HP is below threshold
        if (this.speedIncreaseThreshold > 0 && this.monsterHP < this.speedIncreaseThreshold) {
            if (this.difficulty === 'normal') {
                nextDecreaseTime = Math.random() * 200 + 100; // Normal: 100-300ms (slightly faster)
            } else if (this.difficulty === 'hard') {
                nextDecreaseTime = Math.random() * 150 + 75; // Hard: 75-225ms (faster than normal)
            } else {
                nextDecreaseTime = Math.random() * 150 + 50; // Default: 50-200ms
            }
        }
        
        // Apply big damage randomly in hard mode, but only if HP is above minimum threshold
        if (this.bigDamageChance > 0 && Math.random() < this.bigDamageChance && this.monsterHP > this.bigDamageMinHP) {
            decreaseAmount = Math.random() * 300 + 200; // Big damage: 200-500 HP
            this.ui.showBigDamageIndicator();
        }
        
        // Apply damage
        this.monsterHP = Math.max(0, this.monsterHP - decreaseAmount);
        this.ui.updateHealthBar(this.monsterHP, this.maxHP);
        
        // Check if monster HP dropped below fail threshold
        if (this.failThreshold > 0 && this.monsterHP < this.failThreshold) {
            this.endGame(false, this.monsterHP);
            return;
        }
        
        // Check if monster died
        if (this.monsterHP <= 0) {
            this.endGame(false, 0);
            return;
        }
        
        setTimeout(() => this.decreaseHP(), nextDecreaseTime);
    }
    
    smite() {
        if (!this.gameActive || !this.isHovering) return;
        
        // Apply latency before showing smite effect
        setTimeout(() => {
            // Show smite effect
            this.ui.showSmiteEffect();
            
            if (this.monsterHP > 1200) {
                // Player smited too early
                this.endGame(false, this.monsterHP);
            } else {
                // Successful smite
                this.endGame(true, this.monsterHP);
            }
        }, this.settings.getLatency());
    }
    
    endGame(success, hpAtSmite) {
        this.gameActive = false;
        
        // Calculate score (how close to 1200 HP)
        const score = Math.abs(1200 - hpAtSmite);
        
        // Update current score display as integer
        this.ui.updateCurrentScore(Math.round(hpAtSmite) + ' HP');
        
        if (success) {
            this.ui.showSuccessMessage(`You smited at ${Math.round(hpAtSmite)} HP!`);
            
            // Add to best scores for current difficulty
            this.settings.addBestScore(this.difficulty, hpAtSmite);
            this.ui.updateBestScoresDisplay(this.settings.getBestScores(this.difficulty));
            
            // Fade out the monster on successful smite
            this.ui.fadeOutMonster();
        } else {
            if (hpAtSmite === 0) {
                this.ui.showFailedMessage('Baron Nashor died before you could smite!');
            } else if (this.failThreshold > 0 && hpAtSmite < this.failThreshold) {
                this.ui.showFailedMessage(`HP dropped below ${this.failThreshold}! You must smite before this happens.`);
            } else {
                this.ui.showFailedMessage(`You smited at ${Math.round(hpAtSmite)} HP (too early!)`);
            }
        }
        
        this.ui.showGameMessage();
    }
    
    setHovering(isHovering) {
        this.isHovering = isHovering;
    }
}
// Settings class - handles game settings and persistence
class Settings {
    constructor() {
        this.latency = parseInt(localStorage.getItem('smiteLatency')) || 1; // Default 1ms
        this.smiteKey = localStorage.getItem('smiteKey') || 'F'; // Default smite key
        
        // Separate best scores for each difficulty
        this.bestScores = {
            easy: JSON.parse(localStorage.getItem('smiteBestScores_easy')) || [],
            normal: JSON.parse(localStorage.getItem('smiteBestScores_normal')) || [],
            hard: JSON.parse(localStorage.getItem('smiteBestScores_hard')) || []
        };
    }
    
    getLatency() {
        return this.latency;
    }
    
    setLatency(latency) {
        this.latency = latency;
        localStorage.setItem('smiteLatency', latency);
    }
    
    getSmiteKey() {
        return this.smiteKey;
    }
    
    setSmiteKey(key) {
        this.smiteKey = key;
        localStorage.setItem('smiteKey', key);
    }
    
    getBestScores(difficulty) {
        return this.bestScores[difficulty] || [];
    }
    
    addBestScore(difficulty, score) {
        // Only add successful smites (HP <= 1200)
        if (score <= 1200) {
            this.bestScores[difficulty].push(score);
            
            // Sort by closest to 1200 (descending)
            this.bestScores[difficulty].sort((a, b) => {
                const scoreA = Math.abs(1200 - a);
                const scoreB = Math.abs(1200 - b);
                return scoreA - scoreB;
            });
            
            // Keep only top 5 scores
            if (this.bestScores[difficulty].length > 5) {
                this.bestScores[difficulty] = this.bestScores[difficulty].slice(0, 5);
            }
            
            // Save to localStorage for current difficulty
            localStorage.setItem(`smiteBestScores_${difficulty}`, JSON.stringify(this.bestScores[difficulty]));
        }
    }
    
    resetAllScores() {
        // Clear the best scores object
        this.bestScores = {
            easy: [],
            normal: [],
            hard: []
        };
        
        // Clear localStorage
        localStorage.removeItem('smiteBestScores_easy');
        localStorage.removeItem('smiteBestScores_normal');
        localStorage.removeItem('smiteBestScores_hard');
    }
}
// UI class - handles UI updates and DOM manipulation
class UI {
    constructor(settings) {
        this.settings = settings;
        
        // DOM elements
        this.healthBar = document.getElementById('healthBar');
        this.healthText = document.getElementById('healthText');
        this.monsterContainer = document.getElementById('monsterContainer');
        this.monster = document.getElementById('monster');
        this.gameMessage = document.getElementById('gameMessage');
        this.messageTitle = document.getElementById('messageTitle');
        this.messageText = document.getElementById('messageText');
        this.restartButton = document.getElementById('restartButton');
        this.mainMenuButton = document.getElementById('mainMenuButton');
        this.currentScoreDisplay = document.getElementById('currentScore');
        this.bestScoreDisplay = document.getElementById('bestScore');
        this.bestScoresList = document.getElementById('bestScoresList');
        this.smiteEffect = document.getElementById('smiteEffect');
        this.bigDamageIndicator = document.getElementById('bigDamageIndicator');
        this.currentDifficultyDisplay = document.getElementById('currentDifficulty');
        this.thresholdWarning = document.getElementById('thresholdWarning');
        this.currentLatencyDisplay = document.getElementById('currentLatencyDisplay');
        this.smiteButtonName = document.getElementById('smiteButtonName');
        this.smiteKeyDisplay = document.getElementById('smiteKeyDisplay');
        
        // Start screen elements
        this.startScreen = document.getElementById('startScreen');
        this.easyButton = document.getElementById('easyButton');
        this.normalButton = document.getElementById('normalButton');
        this.hardButton = document.getElementById('hardButton');
        this.resetScoresButton = document.getElementById('resetScoresButton');
        this.optionsButton = document.getElementById('optionsButton');
        this.helpButton = document.getElementById('helpButton');
        
        // Options modal elements
        this.optionsModal = document.getElementById('optionsModal');
        this.latencySettingsButton = document.getElementById('latencySettingsButton');
        this.changeButtonButton = document.getElementById('changeButtonButton');
        this.cancelOptionsButton = document.getElementById('cancelOptionsButton');
        this.currentLatencySpan = document.getElementById('currentLatency');
        this.currentButtonSpan = document.getElementById('currentButton');
        
        // Latency modal elements
        this.latencyModal = document.getElementById('latencyModal');
        this.cancelLatencyButton = document.getElementById('cancelLatencyButton');
        this.saveLatencyButton = document.getElementById('saveLatencyButton');
        this.latencyOptions = document.querySelectorAll('.latency-option');
        
        // Change button modal elements
        this.changeButtonModal = document.getElementById('changeButtonModal');
        this.cancelChangeButtonButton = document.getElementById('cancelChangeButtonButton');
        this.buttonListening = document.getElementById('buttonListening');
        this.currentButtonDisplay = document.getElementById('currentButtonDisplay');
        
        // Help modal elements
        this.helpModal = document.getElementById('helpModal');
        this.closeHelpButton = document.getElementById('closeHelpButton');
        
        // Confirmation message element
        this.confirmationMessage = document.getElementById('confirmationMessage');
        
        // Loading screen element
        this.loadingScreen = document.getElementById('loadingScreen');
        
        // Update smite key displays
        this.updateSmiteKeyDisplays();
        
        // Update latency display
        this.updateLatencyDisplay();
    }
    
    updateSmiteKeyDisplays() {
        const smiteKey = this.settings.getSmiteKey();
        this.smiteButtonName.textContent = smiteKey;
        this.smiteKeyDisplay.textContent = smiteKey;
        this.currentButtonSpan.textContent = smiteKey;
        this.currentButtonDisplay.textContent = smiteKey;
    }
    
    updateLatencyDisplay() {
        const latency = this.settings.getLatency();
        this.currentLatencyDisplay.textContent = latency + 'ms';
        this.currentLatencySpan.textContent = latency + 'ms';
        
        // Update selected latency option
        this.latencyOptions.forEach(option => {
            option.classList.remove('selected');
            if (parseInt(option.dataset.latency) === latency) {
                option.classList.add('selected');
            }
        });
    }
    
    updateHealthBar(monsterHP, maxHP) {
        const healthPercentage = (monsterHP / maxHP) * 100;
        this.healthBar.style.width = `${healthPercentage}%`;
        this.healthText.textContent = `${Math.round(monsterHP)} / ${maxHP} HP`;
        
        // Always use red gradient
        this.healthBar.style.background = 'linear-gradient(90deg, #c44569 0%, #ff4757 50%, #c44569 100%)';
    }
    
    updateBestScoresDisplay(scores) {
        if (scores.length === 0) {
            this.bestScoresList.innerHTML = '<li>No scores yet</li>';
            this.bestScoreDisplay.textContent = '-';
        } else {
            this.bestScoresList.innerHTML = '';
            scores.forEach((score, index) => {
                const li = document.createElement('li');
                li.textContent = `${Math.round(score)} HP`;
                this.bestScoresList.appendChild(li);
            });
            
            // Display best score (closest to 1200) as integer
            this.bestScoreDisplay.textContent = Math.round(scores[0]) + ' HP';
        }
    }
    
    updateCurrentScore(score) {
        this.currentScoreDisplay.textContent = score;
    }
    
    updateCurrentDifficulty(difficulty) {
        this.currentDifficultyDisplay.textContent = difficulty;
    }
    
    showSmiteEffect() {
        this.smiteEffect.classList.add('active');
        setTimeout(() => {
            this.smiteEffect.classList.remove('active');
        }, 600);
    }
    
    showBigDamageIndicator() {
        this.bigDamageIndicator.classList.add('active');
        setTimeout(() => {
            this.bigDamageIndicator.classList.remove('active');
        }, 1000);
    }
    
    showSuccessMessage(message) {
        this.messageTitle.textContent = 'Success!';
        this.gameMessage.classList.add('success');
        this.gameMessage.classList.remove('failed');
        this.messageText.textContent = message;
    }
    
    showFailedMessage(message) {
        this.messageTitle.textContent = 'Failed!';
        this.gameMessage.classList.add('failed');
        this.gameMessage.classList.remove('success');
        this.messageText.textContent = message;
    }
    
    showGameMessage() {
        this.gameMessage.style.display = 'block';
    }
    
    hideGameMessage() {
        this.gameMessage.style.display = 'none';
    }
    
    showThresholdWarning() {
        this.thresholdWarning.classList.add('active');
    }
    
    hideThresholdWarning() {
        this.thresholdWarning.classList.remove('active');
    }
    
    showStartScreen() {
        this.startScreen.style.display = 'flex';
    }
    
    hideStartScreen() {
        this.startScreen.style.display = 'none';
    }
    
    showOptionsModal() {
        this.optionsModal.classList.add('active');
    }
    
    hideOptionsModal() {
        this.optionsModal.classList.remove('active');
    }
    
    showLatencyModal() {
        this.latencyModal.classList.add('active');
    }
    
    hideLatencyModal() {
        this.latencyModal.classList.remove('active');
    }
    
    showChangeButtonModal() {
        this.changeButtonModal.classList.add('active');
    }
    
    hideChangeButtonModal() {
        this.changeButtonModal.classList.remove('active');
    }
    
    showHelpModal() {
        this.helpModal.classList.add('active');
    }
    
    hideHelpModal() {
        this.helpModal.classList.remove('active');
    }
    
    showConfirmationMessage(message) {
        this.confirmationMessage.textContent = message;
        this.confirmationMessage.style.display = 'block';
        setTimeout(() => {
            this.confirmationMessage.style.display = 'none';
        }, 2000);
    }
    
    showButtonListening() {
        this.buttonListening.style.display = 'block';
    }
    
    hideButtonListening() {
        this.buttonListening.style.display = 'none';
    }
    
    setGame(game) {
        this.game = game;
    }
    
    fadeOutMonster() {
        this.monster.classList.add('fading');
    }
    
    resetMonsterOpacity() {
        this.monster.classList.remove('fading');
    }
    
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
    }
}
// EventHandler class - handles all event listeners
class EventHandler {
    constructor(game, ui, settings) {
        this.game = game;
        this.ui = ui;
        this.settings = settings;
        this.isListeningForKey = false;
    }
    
    init() {
        // Monster hover events
        this.ui.monsterContainer.addEventListener('mouseenter', () => {
            this.game.setHovering(true);
        });
        
        this.ui.monsterContainer.addEventListener('mouseleave', () => {
            this.game.setHovering(false);
        });
        
        // Global key listener for smite and button change
        document.addEventListener('keydown', (e) => {
            // If we're listening for a new smite button
            if (this.isListeningForKey) {
                // Don't allow Escape or Enter as smite keys
                if (e.key !== 'Escape' && e.key !== 'Enter') {
                    this.saveSmiteButton(e.key.toUpperCase());
                }
                return;
            }
            
            // Normal smite key handling
            if (e.key.toUpperCase() === this.settings.getSmiteKey()) {
                this.game.smite();
            }
        });
        
        // Game control buttons
        this.ui.restartButton.addEventListener('click', () => {
            this.game.initGame();
        });
        
        this.ui.mainMenuButton.addEventListener('click', () => {
            this.ui.hideGameMessage();
            this.ui.showStartScreen();
        });
        
        // Start screen buttons
        this.ui.easyButton.addEventListener('click', () => {
            this.game.startGame('easy');
        });
        
        this.ui.normalButton.addEventListener('click', () => {
            this.game.startGame('normal');
        });
        
        this.ui.hardButton.addEventListener('click', () => {
            this.game.startGame('hard');
        });
        
        this.ui.resetScoresButton.addEventListener('click', () => {
            this.resetAllScores();
        });
        
        this.ui.optionsButton.addEventListener('click', () => {
            this.ui.showOptionsModal();
        });
        
        this.ui.helpButton.addEventListener('click', () => {
            this.ui.showHelpModal();
        });
        
        // Options modal buttons
        this.ui.cancelOptionsButton.addEventListener('click', () => {
            this.ui.hideOptionsModal();
        });
        
        this.ui.latencySettingsButton.addEventListener('click', () => {
            this.ui.hideOptionsModal();
            this.ui.showLatencyModal();
        });
        
        this.ui.changeButtonButton.addEventListener('click', () => {
            this.ui.hideOptionsModal();
            this.showChangeButtonModal();
        });
        
        // Latency modal buttons
        this.ui.cancelLatencyButton.addEventListener('click', () => {
            this.ui.hideLatencyModal();
            this.ui.showOptionsModal();
        });
        
        this.ui.saveLatencyButton.addEventListener('click', () => {
            this.saveLatencySettings();
        });
        
        // Latency option selection
        this.ui.latencyOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                this.ui.latencyOptions.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update selected latency
                const selectedLatency = parseInt(option.dataset.latency);
                this.settings.setLatency(selectedLatency);
                
                // Update current latency display
                this.ui.currentLatencySpan.textContent = selectedLatency + 'ms';
            });
        });
        
        // Change button modal buttons
        this.ui.cancelChangeButtonButton.addEventListener('click', () => {
            this.hideChangeButtonModal();
        });
        
        // Help modal buttons
        this.ui.closeHelpButton.addEventListener('click', () => {
            this.ui.hideHelpModal();
        });
    }
    
    resetAllScores() {
        if (confirm('Are you sure you want to reset all scores for all difficulties?')) {
            this.settings.resetAllScores();
            
            // Update best scores display if we're in game
            if (this.game.difficulty) {
                this.ui.updateBestScoresDisplay(this.settings.getBestScores(this.game.difficulty));
            }
            
            // Update best score display
            this.ui.bestScoreDisplay.textContent = '-';
            
            // Show confirmation message
            this.ui.showConfirmationMessage('All scores have been reset!');
        }
    }
    
    saveLatencySettings() {
        // Update displays
        this.ui.updateLatencyDisplay();
        
        // Close modal
        this.ui.hideLatencyModal();
        this.ui.showOptionsModal();
    }
    
    showChangeButtonModal() {
        this.ui.showChangeButtonModal();
        this.isListeningForKey = true;
        this.ui.showButtonListening();
    }
    
    hideChangeButtonModal() {
        this.ui.hideChangeButtonModal();
        this.ui.showOptionsModal();
        this.isListeningForKey = false;
        this.ui.hideButtonListening();
    }
    
    saveSmiteButton(key) {
        this.settings.setSmiteKey(key);
        this.ui.updateSmiteKeyDisplays();
        this.hideChangeButtonModal();
    }
}
// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    const settings = new Settings();
    const ui = new UI(settings);
    const game = new Game(settings, ui);
    const eventHandler = new EventHandler(game, ui, settings);
    
    // Set the game reference in UI
    ui.setGame(game);
    
    // Initialize event handlers
    eventHandler.init();
    
    // Hide loading screen after a short delay to ensure everything is ready
    setTimeout(() => {
        ui.hideLoadingScreen();
    }, 1000);
    
    // Show start screen
    ui.showStartScreen();
});