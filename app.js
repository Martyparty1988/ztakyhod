// Fofr Pedro - Czech Endless Runner PWA
// Version 3.0 - Sharp Humor Edition

class FofrPedroGame {
    constructor() {
        this.version = '3.0';
        this.debug = new URLSearchParams(window.location.search).has('debug');
        
        // Game state
        this.gameState = 'loading'; // loading, menu, playing, paused, gameOver
        this.score = 0;
        this.distance = 0;
        this.speed = 3;
        this.maxSpeed = 8;
        this.lives = 3;
        this.currentLane = 1; // 0=left, 1=center, 2=right
        this.isJumping = false;
        this.isSliding = false;
        this.jumpTime = 0;
        this.slideTime = 0;
        
        // Game objects
        this.obstacles = [];
        this.powerups = [];
        this.activePowerups = {};
        this.particles = [];
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.lastTime = 0;
        this.animationId = null;
        
        // Input handling
        this.touchStart = null;
        this.keys = {};
        
        // Settings
        this.settings = {
            sound: true,
            music: true,
            haptics: true,
            theme: 'auto',
            spice: 'mild',
            altControls: false
        };
        
        // Game data
        this.gameData = {
            highScore: 0,
            bestSpeed: 0,
            leaderboard: [],
            achievements: [],
            lastPlayDate: null
        };
        
        // Game constants
        this.LANE_WIDTH = 130;
        this.LANE_POSITIONS = [130, 260, 390]; // Adjusted for iPhone 15 Pro
        this.JUMP_HEIGHT = 100;
        this.JUMP_DURATION = 800;
        this.SLIDE_DURATION = 600;
        
        // Phrases for different spice levels
        this.phrases = {
            mild: [
                "Motá se fízl na ocase, přidej!",
                "Brčko na cestě, drž lajnu vpravo!",
                "Sáček ve větru - změň pruh!",
                "Neviditelnej? Tak dělej!",
                "Holubi všude, pozor na hlavy!",
                "Karta na zemi, opatrně!"
            ],
            spicy: [
                "Dej šlápnout – a ne do kyble!",
                "Karta píchá, skluzem to obejdi!",
                "Injekce před tebou – přeskoč a žij!",
                "Holubi na tripu – nesnaž se jim vysvětlit fyziku!",
                "Majáky v zrcátku. Hraj mrtvýho brouka? Radši ne.",
                "Brčko klouzavé jak tvoje morálka!"
            ]
        };
        
        // Daily challenges
        this.dailyChallenges = [
            { name: "Minimalistická jízda", desc: "Přežij 400 m bez power-upu", target: 400, type: "distance_no_powerup" },
            { name: "Skluzavý mistr", desc: "Projdi 5 překážek skluzem", target: 5, type: "slide_obstacles" },
            { name: "Karlínský survival", desc: "Přežij Karlín bez kolize", target: 1, type: "location_perfect" },
            { name: "Rychlý Pedro", desc: "Dosáhni rychlosti 7", target: 7, type: "max_speed" },
            { name: "Sběratel", desc: "Sebral 10 power-upů", target: 10, type: "collect_powerups" }
        ];
    }
    
    async init() {
        console.log(`Fofr Pedro v${this.version} - Build: ${Date.now()}`);
        
        // Load saved data
        this.loadData();
        
        // Setup canvas
        this.setupCanvas();
        
        // Setup event listeners with proper timing
        await this.setupEventListeners();
        
        // Setup touch controls
        this.setupTouchControls();
        
        // Initialize UI
        this.updateSettings();
        this.updateLeaderboard();
        
        // Show install prompt if needed
        this.setupPWA();
        
        // Start loading assets
        await this.loadAssets();
        
        // Generate daily challenge
        this.generateDailyChallenge();
        
        // Transition to main menu
        setTimeout(() => {
            this.showScreen('main-menu');
            this.gameState = 'menu';
        }, 1500);
        
        if (this.debug) {
            this.setupDebug();
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size for iPhone 15 Pro
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = 390 * dpr;
        this.canvas.height = 844 * dpr;
        this.canvas.style.width = '390px';
        this.canvas.style.height = '844px';
        
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = true;
    }
    
    async setupEventListeners() {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
        
        // Screen navigation - using both click and touchend for better mobile support
        const addButtonListener = (id, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                element.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        };
        
        // Main menu buttons
        addButtonListener('play-btn', () => this.startGame());
        addButtonListener('settings-btn', () => this.showScreen('settings-screen'));
        addButtonListener('leaderboard-btn', () => this.showScreen('leaderboard-screen'));
        addButtonListener('daily-challenge-btn', () => this.showScreen('challenge-screen'));
        
        // Back buttons
        addButtonListener('settings-back-btn', () => this.showScreen('main-menu'));
        addButtonListener('leaderboard-back-btn', () => this.showScreen('main-menu'));
        addButtonListener('challenge-back-btn', () => this.showScreen('main-menu'));
        
        // Game controls
        addButtonListener('resume-btn', () => this.resumeGame());
        addButtonListener('restart-btn', () => this.restartGame());
        addButtonListener('menu-btn', () => this.exitToMenu());
        
        // Game over
        addButtonListener('play-again-btn', () => this.startGame());
        addButtonListener('back-to-menu-btn', () => this.showScreen('main-menu'));
        addButtonListener('save-score-btn', () => this.saveScore());
        
        // Challenge
        addButtonListener('start-challenge-btn', () => this.startChallenge());
        
        // Settings with proper event handling
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.settings.sound = e.target.checked;
                this.saveData();
            });
        }
        
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                this.settings.music = e.target.checked;
                this.saveData();
            });
        }
        
        const hapticsToggle = document.getElementById('haptics-toggle');
        if (hapticsToggle) {
            hapticsToggle.addEventListener('change', (e) => {
                this.settings.haptics = e.target.checked;
                this.saveData();
            });
        }
        
        const altControlsToggle = document.getElementById('alt-controls-toggle');
        if (altControlsToggle) {
            altControlsToggle.addEventListener('change', (e) => {
                this.settings.altControls = e.target.checked;
                const altControls = document.getElementById('alt-controls');
                if (altControls) {
                    altControls.classList.toggle('hidden', !e.target.checked);
                }
                this.saveData();
            });
        }
        
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applyTheme();
                this.saveData();
            });
        }
        
        const spiceSelect = document.getElementById('spice-select');
        if (spiceSelect) {
            spiceSelect.addEventListener('change', (e) => {
                this.settings.spice = e.target.value;
                this.saveData();
            });
        }
        
        // Data management
        addButtonListener('export-data-btn', () => this.exportData());
        addButtonListener('import-data-btn', () => {
            const importFile = document.getElementById('import-file');
            if (importFile) importFile.click();
        });
        
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importData(e));
        }
        
        // Alternative controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleInput(action);
            });
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.handleInput(action);
            });
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (this.gameState === 'playing') {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.handleInput('left');
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.handleInput('right');
                        break;
                    case 'ArrowUp':
                    case ' ':
                        e.preventDefault();
                        this.handleInput('jump');
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.handleInput('slide');
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.pauseGame();
                        break;
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pauseGame();
            }
            this.saveData();
        });
        
        // Page unload
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
    }
    
    setupTouchControls() {
        const swipeArea = document.getElementById('swipe-area');
        if (!swipeArea) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        swipeArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        }, { passive: false });
        
        swipeArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        swipeArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.gameState !== 'playing') return;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const deltaTime = Date.now() - touchStartTime;
            
            const minDistance = 30;
            const maxTime = 500;
            
            if (deltaTime > maxTime) return;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (Math.abs(deltaX) > minDistance) {
                    if (deltaX > 0) {
                        this.handleInput('right');
                    } else {
                        this.handleInput('left');
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(deltaY) > minDistance) {
                    if (deltaY < 0) {
                        this.handleInput('jump');
                    } else {
                        this.handleInput('slide');
                    }
                }
            }
        }, { passive: false });
        
        // Pause on canvas tap (only if no swipe detected)
        if (this.canvas) {
            this.canvas.addEventListener('click', () => {
                if (this.gameState === 'playing') {
                    this.pauseGame();
                }
            });
        }
    }
    
    setupPWA() {
        let deferredPrompt;
        const installPrompt = document.getElementById('install-prompt');
        const installBtn = document.getElementById('install-btn');
        const installClose = document.getElementById('install-close');
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt after a delay
            setTimeout(() => {
                if (installPrompt) installPrompt.classList.remove('hidden');
            }, 3000);
        });
        
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`PWA install: ${outcome}`);
                    deferredPrompt = null;
                }
                if (installPrompt) installPrompt.classList.add('hidden');
            });
        }
        
        if (installClose) {
            installClose.addEventListener('click', () => {
                if (installPrompt) installPrompt.classList.add('hidden');
            });
        }
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.showToast('Hra byla nainstalována!', 'success');
        });
    }
    
    async loadAssets() {
        // In a real implementation, we would load actual assets here
        // For this demo, we'll simulate loading time
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }
    
    setupDebug() {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) fpsCounter.classList.remove('hidden');
        
        // Debug key bindings
        document.addEventListener('keydown', (e) => {
            if (!this.debug) return;
            
            switch(e.key) {
                case '1':
                    this.spawnPowerup();
                    break;
                case '2':
                    this.spawnObstacle();
                    break;
                case '3':
                    this.addScore(100);
                    break;
                case '4':
                    this.speed = Math.min(this.speed + 1, this.maxSpeed);
                    break;
            }
        });
        
        console.log('Debug mode enabled. Keys: 1=powerup, 2=obstacle, 3=score, 4=speed');
    }
    
    handleInput(action) {
        if (this.gameState !== 'playing') return;
        
        switch(action) {
            case 'left':
                if (this.currentLane > 0) {
                    this.currentLane--;
                    this.playSound('swipe');
                    this.vibrate(20);
                }
                break;
                
            case 'right':
                if (this.currentLane < 2) {
                    this.currentLane++;
                    this.playSound('swipe');
                    this.vibrate(20);
                }
                break;
                
            case 'jump':
                if (!this.isJumping && !this.isSliding) {
                    this.isJumping = true;
                    this.jumpTime = 0;
                    this.playSound('jump');
                    this.vibrate(30);
                }
                break;
                
            case 'slide':
                if (!this.isJumping && !this.isSliding) {
                    this.isSliding = true;
                    this.slideTime = 0;
                    this.playSound('slide');
                    this.vibrate(25);
                }
                break;
        }
    }
    
    startGame() {
        this.resetGame();
        this.showScreen('game-screen');
        this.gameState = 'playing';
        this.startGameLoop();
    }
    
    startChallenge() {
        // For demo, start regular game with challenge mode flag
        this.challengeMode = true;
        this.startGame();
        this.showToast('Výzva začíná!', 'info');
    }
    
    resetGame() {
        this.score = 0;
        this.distance = 0;
        this.speed = 3;
        this.lives = 3;
        this.currentLane = 1;
        this.isJumping = false;
        this.isSliding = false;
        this.jumpTime = 0;
        this.slideTime = 0;
        this.obstacles = [];
        this.powerups = [];
        this.activePowerups = {};
        this.particles = [];
        this.challengeMode = false;
        
        this.updateHUD();
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            if (this.gameState !== 'playing') return;
            
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            this.update(deltaTime);
            this.render();
            
            if (this.debug) {
                this.updateFPS(deltaTime);
            }
            
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        const dt = Math.min(deltaTime / 1000, 0.016); // Cap at 60fps
        
        // Update distance and score
        this.distance += this.speed * dt * 10;
        this.score = Math.floor(this.distance / 10);
        
        // Increase speed over time
        if (this.speed < this.maxSpeed) {
            this.speed += dt * 0.2;
        }
        
        // Update jump/slide
        if (this.isJumping) {
            this.jumpTime += deltaTime;
            if (this.jumpTime >= this.JUMP_DURATION) {
                this.isJumping = false;
                this.jumpTime = 0;
            }
        }
        
        if (this.isSliding) {
            this.slideTime += deltaTime;
            if (this.slideTime >= this.SLIDE_DURATION) {
                this.isSliding = false;
                this.slideTime = 0;
            }
        }
        
        // Update power-ups
        this.updatePowerups(dt);
        
        // Spawn obstacles and power-ups
        this.spawnGameObjects(dt);
        
        // Update obstacles
        this.updateObstacles(dt);
        
        // Update particles
        this.updateParticles(dt);
        
        // Check collisions
        this.checkCollisions();
        
        // Update HUD
        this.updateHUD();
        
        // Random phrase
        if (Math.random() < 0.001) {
            this.showRandomPhrase();
        }
    }
    
    updatePowerups(dt) {
        Object.keys(this.activePowerups).forEach(type => {
            const powerup = this.activePowerups[type];
            powerup.timeLeft -= dt * 1000;
            
            if (powerup.timeLeft <= 0) {
                delete this.activePowerups[type];
                this.updatePowerupHUD();
            }
        });
    }
    
    spawnGameObjects(dt) {
        // Spawn obstacles
        if (Math.random() < this.speed * dt * 0.3) {
            this.spawnObstacle();
        }
        
        // Spawn power-ups (less frequently)
        if (Math.random() < dt * 0.1) {
            this.spawnPowerup();
        }
    }
    
    spawnObstacle() {
        const types = ['police', 'car', 'barrier', 'pigeon', 'injection', 'bag', 'card', 'straw'];
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = Math.floor(Math.random() * 3);
        
        this.obstacles.push({
            type: type,
            x: this.LANE_POSITIONS[lane],
            y: -50,
            lane: lane,
            width: 40,
            height: 40,
            speed: this.speed + 2
        });
    }
    
    spawnPowerup() {
        const types = ['speed', 'invisible', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = Math.floor(Math.random() * 3);
        
        this.powerups.push({
            type: type,
            x: this.LANE_POSITIONS[lane],
            y: -50,
            lane: lane,
            width: 30,
            height: 30,
            speed: this.speed + 1
        });
    }
    
    updateObstacles(dt) {
        this.obstacles = this.obstacles.filter((obstacle) => {
            obstacle.y += obstacle.speed * dt * 60;
            return obstacle.y <= 900;
        });
        
        this.powerups = this.powerups.filter((powerup) => {
            powerup.y += powerup.speed * dt * 60;
            return powerup.y <= 900;
        });
    }
    
    updateParticles(dt) {
        this.particles = this.particles.filter((particle) => {
            particle.life -= dt;
            particle.x += particle.vx * dt * 60;
            particle.y += particle.vy * dt * 60;
            particle.vy += 200 * dt; // Gravity
            return particle.life > 0;
        });
    }
    
    checkCollisions() {
        const pedroX = this.LANE_POSITIONS[this.currentLane];
        const pedroY = 600; // Pedro's position
        const pedroWidth = 30;
        const pedroHeight = this.isSliding ? 20 : 40;
        
        // Check obstacle collisions
        this.obstacles = this.obstacles.filter((obstacle) => {
            if (this.isColliding(pedroX, pedroY, pedroWidth, pedroHeight, 
                               obstacle.x, obstacle.y, obstacle.width, obstacle.height)) {
                
                // Check if invincible
                if (this.activePowerups.invisible) {
                    this.addParticleEffect(obstacle.x, obstacle.y, '#00d4ff');
                    return false; // Remove obstacle
                }
                
                // Handle collision based on obstacle type
                this.handleObstacleCollision(obstacle);
                return false; // Remove obstacle
            }
            return true; // Keep obstacle
        });
        
        // Check power-up collisions
        this.powerups = this.powerups.filter((powerup) => {
            if (this.isColliding(pedroX, pedroY, pedroWidth, pedroHeight, 
                               powerup.x, powerup.y, powerup.width, powerup.height)) {
                this.collectPowerup(powerup);
                return false; // Remove power-up
            }
            return true; // Keep power-up
        });
    }
    
    isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
    
    handleObstacleCollision(obstacle) {
        // Different collision handling based on obstacle type
        switch(obstacle.type) {
            case 'injection':
                if (!this.isJumping) {
                    this.takeDamage();
                }
                break;
            case 'card':
                if (!this.isSliding) {
                    this.takeDamage();
                }
                break;
            case 'straw':
                // Slippery effect - change lanes randomly
                this.currentLane = Math.floor(Math.random() * 3);
                this.showToast('Klouzavo!', 'warning');
                break;
            default:
                this.takeDamage();
        }
        
        this.addParticleEffect(obstacle.x, obstacle.y, '#ff4444');
        this.playSound('collision');
        this.vibrate(100);
    }
    
    takeDamage() {
        this.lives--;
        this.showToast('Ouch!', 'error');
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
    
    collectPowerup(powerup) {
        const duration = powerup.type === 'life' ? 0 : (powerup.type === 'speed' ? 5000 : 3000);
        
        switch(powerup.type) {
            case 'speed':
                this.activePowerups.speed = { timeLeft: duration };
                this.speed = Math.min(this.speed * 1.5, this.maxSpeed);
                this.showToast('Rychlý šleh!', 'success');
                break;
            case 'invisible':
                this.activePowerups.invisible = { timeLeft: duration };
                this.showToast('Neviditelnost!', 'success');
                break;
            case 'life':
                this.lives++;
                this.showToast('Extra cévko!', 'success');
                break;
        }
        
        this.addParticleEffect(powerup.x, powerup.y, '#00d4ff');
        this.updatePowerupHUD();
        this.playSound('powerup');
        this.vibrate(50);
    }
    
    addParticleEffect(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: -Math.random() * 100,
                life: 1,
                color: color
            });
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0b1220';
        this.ctx.fillRect(0, 0, 390, 844);
        
        // Render background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 844);
        gradient.addColorStop(0, '#0b1220');
        gradient.addColorStop(1, '#0e152b');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 390, 844);
        
        // Render lanes
        this.renderLanes();
        
        // Render obstacles
        this.obstacles.forEach(obstacle => this.renderObstacle(obstacle));
        
        // Render power-ups
        this.powerups.forEach(powerup => this.renderPowerup(powerup));
        
        // Render Pedro
        this.renderPedro();
        
        // Render particles
        this.particles.forEach(particle => this.renderParticle(particle));
        
        // Render effects
        if (this.activePowerups.invisible) {
            this.renderInvisibleEffect();
        }
    }
    
    renderLanes() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        
        // Lane dividers
        this.ctx.beginPath();
        this.ctx.moveTo(195, 0);
        this.ctx.lineTo(195, 844);
        this.ctx.moveTo(325, 0);
        this.ctx.lineTo(325, 844);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
    }
    
    renderObstacle(obstacle) {
        const { x, y, width, height, type } = obstacle;
        
        // Simple colored rectangles for different obstacle types
        const colors = {
            police: '#ff4444',
            car: '#4444ff',
            barrier: '#ffaa44',
            pigeon: '#888888',
            injection: '#ff88ff',
            bag: '#88ff88',
            card: '#ffffff',
            straw: '#ffff88'
        };
        
        this.ctx.fillStyle = colors[type] || '#ffffff';
        this.ctx.fillRect(x - width/2, y, width, height);
        
        // Add some visual details
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x - width/2 + 2, y + 2, width - 4, height - 4);
    }
    
    renderPowerup(powerup) {
        const { x, y, width, height, type } = powerup;
        
        const colors = {
            speed: '#00d4ff',
            invisible: '#ff00ff',
            life: '#ff4444'
        };
        
        this.ctx.fillStyle = colors[type] || '#ffffff';
        this.ctx.fillRect(x - width/2, y, width, height);
        
        // Add glow effect
        this.ctx.shadowColor = colors[type];
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(x - width/2, y, width, height);
        this.ctx.shadowBlur = 0;
    }
    
    renderPedro() {
        const x = this.LANE_POSITIONS[this.currentLane];
        let y = 600;
        
        // Jump animation
        if (this.isJumping) {
            const progress = this.jumpTime / this.JUMP_DURATION;
            const jumpOffset = Math.sin(progress * Math.PI) * this.JUMP_HEIGHT;
            y -= jumpOffset;
        }
        
        // Slide animation (smaller height)
        const height = this.isSliding ? 20 : 40;
        const width = 30;
        
        // Pedro (blue rectangle with some details)
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.fillRect(x - width/2, y, width, height);
        
        // Add invincibility glow
        if (this.activePowerups.invisible) {
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.shadowBlur = 20;
            this.ctx.fillRect(x - width/2, y, width, height);
            this.ctx.shadowBlur = 0;
        }
        
        // Add speed trail
        if (this.activePowerups.speed || this.speed > 6) {
            for (let i = 1; i <= 3; i++) {
                this.ctx.fillStyle = `rgba(0, 212, 255, ${0.3 - i * 0.1})`;
                this.ctx.fillRect(x - width/2, y + i * 10, width, height);
            }
        }
    }
    
    renderParticle(particle) {
        this.ctx.fillStyle = particle.color;
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        this.ctx.globalAlpha = 1;
    }
    
    renderInvisibleEffect() {
        this.ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';
        this.ctx.fillRect(0, 0, 390, 844);
    }
    
    updateHUD() {
        const scoreEl = document.getElementById('score');
        const speedEl = document.getElementById('speed');
        const livesEl = document.getElementById('lives');
        
        if (scoreEl) scoreEl.textContent = this.score;
        if (speedEl) speedEl.textContent = Math.floor(this.speed);
        if (livesEl) livesEl.textContent = this.lives;
    }
    
    updatePowerupHUD() {
        const powerupHUD = document.getElementById('powerup-hud');
        if (!powerupHUD) return;
        
        const activePowerupTypes = Object.keys(this.activePowerups);
        
        if (activePowerupTypes.length > 0) {
            const type = activePowerupTypes[0]; // Show first active power-up
            const powerup = this.activePowerups[type];
            const maxDuration = type === 'speed' ? 5000 : 3000;
            const progress = powerup.timeLeft / maxDuration;
            
            powerupHUD.classList.remove('hidden');
            const timer = powerupHUD.querySelector('.powerup-timer');
            if (timer) {
                timer.style.setProperty('--timer-width', `${progress * 100}%`);
            }
            
            const icons = { speed: '⚡', invisible: '👻', life: '❤️' };
            const iconEl = powerupHUD.querySelector('.powerup-icon');
            if (iconEl) {
                iconEl.textContent = icons[type] || '?';
            }
        } else {
            powerupHUD.classList.add('hidden');
        }
    }
    
    updateFPS(deltaTime) {
        const fps = Math.round(1000 / deltaTime);
        const fpsEl = document.getElementById('fps-value');
        if (fpsEl) fpsEl.textContent = fps;
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) pauseMenu.classList.remove('hidden');
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            const pauseMenu = document.getElementById('pause-menu');
            if (pauseMenu) pauseMenu.classList.add('hidden');
            this.startGameLoop();
        }
    }
    
    restartGame() {
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
        this.startGame();
    }
    
    exitToMenu() {
        this.gameState = 'menu';
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.add('hidden');
        this.showScreen('main-menu');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Update final stats
        const finalScoreEl = document.getElementById('final-score');
        const finalSpeedEl = document.getElementById('final-speed');
        const finalDistanceEl = document.getElementById('final-distance');
        
        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (finalSpeedEl) finalSpeedEl.textContent = Math.floor(this.speed);
        if (finalDistanceEl) finalDistanceEl.textContent = Math.floor(this.distance) + 'm';
        
        // Check for new record
        const isNewRecord = this.score > this.gameData.highScore;
        if (isNewRecord) {
            this.gameData.highScore = this.score;
            this.gameData.bestSpeed = Math.max(this.gameData.bestSpeed, Math.floor(this.speed));
            const newRecordEl = document.getElementById('new-record');
            const nameInputEl = document.getElementById('name-input');
            if (newRecordEl) newRecordEl.classList.remove('hidden');
            if (nameInputEl) nameInputEl.classList.remove('hidden');
        } else {
            const newRecordEl = document.getElementById('new-record');
            const nameInputEl = document.getElementById('name-input');
            if (newRecordEl) newRecordEl.classList.add('hidden');
            if (nameInputEl) nameInputEl.classList.add('hidden');
        }
        
        this.saveData();
        this.showScreen('game-over');
    }
    
    saveScore() {
        const playerNameEl = document.getElementById('player-name');
        const playerName = playerNameEl ? playerNameEl.value.trim() || 'Pedro' : 'Pedro';
        
        this.gameData.leaderboard.push({
            name: playerName,
            score: this.score,
            date: new Date().toLocaleDateString('cs-CZ')
        });
        
        // Sort and keep top 5
        this.gameData.leaderboard.sort((a, b) => b.score - a.score);
        this.gameData.leaderboard = this.gameData.leaderboard.slice(0, 5);
        
        this.saveData();
        this.updateLeaderboard();
        
        const nameInputEl = document.getElementById('name-input');
        if (nameInputEl) nameInputEl.classList.add('hidden');
        this.showToast('Skóre uloženo!', 'success');
    }
    
    showRandomPhrase() {
        const phrases = this.phrases[this.settings.spice] || this.phrases.mild;
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        this.showToast(phrase, 'info');
    }
    
    generateDailyChallenge() {
        const today = new Date().toDateString();
        if (this.gameData.lastPlayDate !== today) {
            const challenge = this.dailyChallenges[Math.floor(Math.random() * this.dailyChallenges.length)];
            const challengeNameEl = document.getElementById('challenge-name');
            const challengeDescEl = document.getElementById('challenge-description');
            if (challengeNameEl) challengeNameEl.textContent = challenge.name;
            if (challengeDescEl) challengeDescEl.textContent = challenge.desc;
            this.gameData.lastPlayDate = today;
            this.saveData();
        }
    }
    
    updateLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.gameData.leaderboard.length === 0) {
            list.innerHTML = '<p style="text-align: center; opacity: 0.7;">Zatím žádná skóre</p>';
            return;
        }
        
        this.gameData.leaderboard.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';
            div.innerHTML = `
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${entry.name}</div>
                    <div class="leaderboard-date">${entry.date}</div>
                </div>
                <div class="leaderboard-score">${entry.score}</div>
            `;
            list.appendChild(div);
        });
    }
    
    updateSettings() {
        const soundToggle = document.getElementById('sound-toggle');
        const musicToggle = document.getElementById('music-toggle');
        const hapticsToggle = document.getElementById('haptics-toggle');
        const altControlsToggle = document.getElementById('alt-controls-toggle');
        const themeSelect = document.getElementById('theme-select');
        const spiceSelect = document.getElementById('spice-select');
        const altControls = document.getElementById('alt-controls');
        
        if (soundToggle) soundToggle.checked = this.settings.sound;
        if (musicToggle) musicToggle.checked = this.settings.music;
        if (hapticsToggle) hapticsToggle.checked = this.settings.haptics;
        if (altControlsToggle) altControlsToggle.checked = this.settings.altControls;
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (spiceSelect) spiceSelect.value = this.settings.spice;
        
        if (altControls) {
            altControls.classList.toggle('hidden', !this.settings.altControls);
        }
        
        this.applyTheme();
    }
    
    applyTheme() {
        const theme = this.settings.theme;
        if (theme === 'auto') {
            document.body.removeAttribute('data-color-scheme');
        } else {
            document.body.setAttribute('data-color-scheme', theme === 'day' ? 'light' : 'dark');
        }
    }
    
    exportData() {
        const data = {
            version: this.version,
            settings: this.settings,
            gameData: this.gameData
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fofr-pedro-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Data exportována!', 'success');
    }
    
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.version && data.settings && data.gameData) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.gameData = { ...this.gameData, ...data.gameData };
                    
                    this.updateSettings();
                    this.updateLeaderboard();
                    this.saveData();
                    
                    this.showToast('Data importována!', 'success');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Chyba při importu!', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }
    
    saveData() {
        const data = {
            settings: this.settings,
            gameData: this.gameData
        };
        
        try {
            localStorage.setItem('fofrPedro.v3.data', JSON.stringify(data));
        } catch (error) {
            console.error('Save error:', error);
        }
    }
    
    loadData() {
        try {
            const saved = localStorage.getItem('fofrPedro.v3.data');
            if (saved) {
                const data = JSON.parse(saved);
                this.settings = { ...this.settings, ...data.settings };
                this.gameData = { ...this.gameData, ...data.gameData };
            }
        } catch (error) {
            console.error('Load error:', error);
        }
    }
    
    addScore(points) {
        this.score += points;
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    playSound(type) {
        if (!this.settings.sound) return;
        
        // In a real implementation, we would play actual sound files
        console.log(`Playing sound: ${type}`);
    }
    
    vibrate(duration) {
        if (!this.settings.haptics) return;
        
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }
}

// Global toast function for service worker updates
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.fofrPedro = new FofrPedroGame();
});

// Debug console commands
if (window.location.search.includes('debug=1')) {
    window.debugGame = {
        spawnObstacle: () => window.fofrPedro?.spawnObstacle(),
        spawnPowerup: () => window.fofrPedro?.spawnPowerup(),
        addScore: (points) => window.fofrPedro?.addScore(points),
        setSpeed: (speed) => { if (window.fofrPedro) window.fofrPedro.speed = speed; },
        setLane: (lane) => { if (window.fofrPedro) window.fofrPedro.currentLane = lane; },
        showPhrase: () => window.fofrPedro?.showRandomPhrase()
    };
    console.log('Debug commands available: debugGame.spawnObstacle(), debugGame.spawnPowerup(), etc.');
}