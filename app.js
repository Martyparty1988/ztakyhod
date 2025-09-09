// script.js
// --- NEXT-GEN UI ENHANCER ---
class HapticEngine {
    pulse(duration = 10, intensity = 0.5) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }
}

class UIAudioDesigner {
    constructor() {
        this.synth = new Tone.Synth({
            oscillator: { type: 'fmsine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }
        }).toDestination();
    }

    playUISound(soundType) {
        try {
            switch (soundType) {
                case 'button_press': this.synth.triggerAttackRelease('C4', '8n'); break;
                case 'game_start': this.synth.triggerAttackRelease('C5', '8n', Tone.now()); break;
                case 'collision': this.synth.triggerAttackRelease('A2', '4n'); break;
                case 'powerup': this.synth.triggerAttackRelease('G5', '8n'); break;
                case 'flip': this.synth.triggerAttackRelease('E5', '16n'); break;
            }
        } catch(e) { console.error("Tone.js error:", e); }
    }
}

class UIEnhancer {
    constructor() {
        this.hapticEngine = new HapticEngine();
        this.soundDesign = new UIAudioDesigner();
    }
    
    enhanceButton(element) {
        element.addEventListener('pointerdown', (e) => {
            element.style.transform = 'scale(0.96) translateY(2px)';
            this.hapticEngine?.pulse(20);
            this.soundDesign.playUISound('button_press');
            this.createRipple(e.target, e.clientX, e.clientY);
        });
        element.addEventListener('pointerup', () => element.style.transform = '');
        element.addEventListener('pointerleave', () => element.style.transform = '');
    }
    
    createRipple(element, x, y) {
        const rect = element.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.left = `${x - rect.left}px`;
        ripple.style.top = `${y - rect.top}px`;
        ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height)}px`;
        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }
}

// --- UI MANAGEMENT ---
const ui = {
    elements: {
        screens: document.querySelectorAll('.screen'),
        ageWarning: document.getElementById('age-warning'),
        mainMenu: document.getElementById('main-menu'),
        gameOver: document.getElementById('game-over'),
        pauseScreen: document.getElementById('pause-screen'),
        achievementsScreen: document.getElementById('achievements-screen'),
        hud: document.getElementById('hud'),
        pauseBtn: document.getElementById('pause-btn'),
        toast: document.getElementById('toast'),
    },
    
    setup(core, enhancer) {
        document.getElementById('age-confirm-btn').onclick = async () => { 
            await Tone.start(); 
            this.showScreen('main-menu');
        };
        document.getElementById('start-game').onclick = () => core.start();
        document.getElementById('restart-game').onclick = () => core.start();
        document.getElementById('back-to-menu').onclick = () => core.backToMenu();
        document.getElementById('pause-btn').onclick = () => core.pause();
        document.getElementById('resume-game').onclick = () => core.resume();
        document.getElementById('menu-from-pause').onclick = () => core.backToMenu();
        document.getElementById('achievements-btn').onclick = () => this.showAchievements(core);
        document.getElementById('back-from-achievements').onclick = () => this.showScreen('main-menu');
        
        this.setupControls(core);
        window.addEventListener('resize', () => core.engine?.onResize());

        document.querySelectorAll('button').forEach(btn => enhancer.enhanceButton(btn));
    },

    showScreen(screenName) {
        this.elements.screens.forEach(s => s.classList.add('hidden'));
        const screenToShow = document.getElementById(screenName + "-screen") || document.getElementById(screenName);
        if (screenToShow) screenToShow.classList.remove('hidden');

        if (screenName === 'game') {
            this.elements.hud.classList.remove('hidden');
            this.elements.pauseBtn.classList.remove('hidden');
        } else {
            this.elements.hud.classList.add('hidden');
            this.elements.pauseBtn.classList.add('hidden');
        }
    },

    showAchievements(core) {
        const list = document.getElementById('achievements-list');
        list.innerHTML = '';
        for (const key in core.achievements.definitions) {
            const ach = core.achievements.definitions[key];
            const isUnlocked = core.achievements.unlocked.has(key);
            const li = document.createElement('li');
            li.className = isUnlocked ? 'unlocked' : '';
            li.innerHTML = `<h3>${ach.title} ${isUnlocked ? '✔️' : ''}</h3><p>${ach.description}</p>`;
            list.appendChild(li);
        }
        this.showScreen('achievements-screen');
    },

    setupControls(core) {
         let startX, startY;
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', e => { e.preventDefault(); startX = e.touches[0].clientX; startY = e.touches[0].clientY; });
        canvas.addEventListener('touchend', e => {
            e.preventDefault();
            const deltaX = e.changedTouches[0].clientX - startX;
            const deltaY = e.changedTouches[0].clientY - startY;
            if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) core.onSwipe(deltaX > 0 ? 'right' : 'left');
                else core.onSwipe(deltaY < 0 ? 'up' : 'down');
            }
        });

        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
        let konamiIndex = 0;

        document.addEventListener('keydown', e => {
            if (e.code === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    core.activateGodMode();
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }

            if (core.status === 'playing') {
                switch(e.code) {
                    case 'ArrowLeft': case 'KeyA': core.onSwipe('left'); break;
                    case 'ArrowRight': case 'KeyD': core.onSwipe('right'); break;
                    case 'ArrowUp': case 'KeyW': case 'Space': e.preventDefault(); core.onSwipe('up'); break;
                    case 'ArrowDown': case 'KeyS': e.preventDefault(); core.onSwipe('down'); break;
                }
            }
            if (e.code === 'Escape') {
               if (core.status === 'playing') core.pause();
               else if (core.status === 'paused') core.resume();
            }
        });
    },

    showToast(message, duration = 2000) {
        const toast = document.getElementById('toast');
        toast.innerHTML = `<div class="hud-element">${message}</div>`;
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', duration);
    },

    updateHUD(core) {
        document.getElementById('score').textContent = core.score;
        document.getElementById('lives').textContent = core.godMode ? '∞' : core.lives;
        document.getElementById('speed').textContent = core.engine.gameSpeed.toFixed(2) + 'x';
        document.getElementById('combo').textContent = `x${core.combo.count}`;
    },

    updateGameOver(core, cause) {
        document.getElementById('game-over-stats').innerHTML = `
            <p>Důvod: ${cause}</p>
            <p>Finální skóre: ${core.score}</p>
            <p>Nejlepší skóre: ${core.bestScore}</p>
        `;
        this.showScreen('game-over-screen');
    }
};

// --- 3D ENGINE ---
class Game3D {
    constructor(core) {
        this.core = core;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true, alpha: true });
        this.player = null;
        this.obstacles = [];
        this.powerups = [];
        this.lanes = [-2.5, 0, 2.5];
        this.currentLane = 1;
        this.state = { isJumping: false, isSliding: false, isFlipping: false };
        this.physics = { y: 1.1, velocityY: 0 };
        this.gameSpeed = 0.2;
        this.spawnTimer = 0;
        this.cameraShake = { intensity: 0, duration: 0, time: 0 };
        this.init();
    }

    init() {
        this.scene.fog = new THREE.Fog(0x1a1a1d, 30, 100);
        this.camera.position.set(0, 4, 8);
        this.camera.lookAt(0, 2, 0);

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        this.createEnvironment();
        this.createPlayer();
    }

    createEnvironment() {
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 200),
            new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createPlayer() {
        this.player = new THREE.Group();
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8), bodyMaterial);
        body.position.y = 0.6;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), bodyMaterial);
        head.position.y = 1.5;
        this.player.add(body, head);
        this.player.children.forEach(c => c.castShadow = true);
        
        this.player.position.set(0, 0.5, 0);
        this.scene.add(this.player);
    }

    reset() {
        [...this.obstacles, ...this.powerups].forEach(obj => this.scene.remove(obj));
        this.obstacles = [];
        this.powerups = [];
        this.currentLane = 1;
        this.player.position.x = this.lanes[this.currentLane];
        this.player.scale.set(1, 1, 1);
        this.physics.y = 1.1;
        this.player.position.y = this.physics.y;
        this.gameSpeed = 0.2;
    }

    update(deltaTime) {
        this.gameSpeed = 0.2 + (this.core.score * 0.00005);
        
        this.updatePlayer(deltaTime);
        this.spawnObjects();
        this.updateObjects();
        this.checkCollisions();
        
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
    }

    updatePlayer(deltaTime) {
        const targetX = this.lanes[this.currentLane];
        this.player.position.x += (targetX - this.player.position.x) * 15 * deltaTime;

        if (this.state.isJumping || this.state.isFlipping) {
            this.physics.velocityY -= 9.8 * 0.2 * deltaTime;
            this.physics.y += this.physics.velocityY;
            if (this.physics.y <= 1.1) {
                this.physics.y = 1.1;
                this.state.isJumping = this.state.isFlipping = false;
                this.player.rotation.x = 0;
            }
        }
        this.player.position.y = this.physics.y;
        if (this.state.isFlipping) this.player.rotation.x += 15 * deltaTime;
        
        const targetScaleY = this.state.isSliding ? 0.5 : 1;
        this.player.scale.y += (targetScaleY - this.player.scale.y) * 15 * deltaTime;
    }

    spawnObjects() {
        this.spawnTimer -= this.gameSpeed * 0.1;
        if (this.spawnTimer <= 0) {
            const lane = Math.floor(Math.random() * 3);
            if (Math.random() < 0.2) this.spawnPowerup(lane);
            else this.spawnObstacle(lane);
            this.spawnTimer = (5 + Math.random() * 5) / (this.gameSpeed / 0.2);
        }
    }

    spawnObstacle(lane) {
        const isTall = Math.random() > 0.5;
        const geometry = new THREE.BoxGeometry(2, isTall ? 4 : 2, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.6 });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(this.lanes[lane], isTall ? 2 : 1, -80);
        obstacle.castShadow = true;
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    spawnPowerup(lane) {
        const geometry = new THREE.IcosahedronGeometry(0.7, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x4ecdc4, emissive: 0x4ecdc4, emissiveIntensity: 0.5 });
        const powerup = new THREE.Mesh(geometry, material);
        powerup.position.set(this.lanes[lane], 1.5, -80);
        powerup.userData.type = 'shield';
        this.scene.add(powerup);
        this.powerups.push(powerup);
    }
    
    updateObjects() {
        const moveZ = this.gameSpeed * 2;
        [...this.obstacles, ...this.powerups].forEach((obj) => {
            obj.position.z += moveZ;
            obj.rotation.y += 0.01;
            if (obj.position.z > 10) {
                this.scene.remove(obj);
                if (this.obstacles.includes(obj)) this.obstacles.splice(this.obstacles.indexOf(obj), 1);
                else this.powerups.splice(this.powerups.indexOf(obj), 1);
            }
        });
    }

    checkCollisions() {
        const playerBox = new THREE.Box3().setFromObject(this.player);
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            if (playerBox.intersectsBox(new THREE.Box3().setFromObject(obs))) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
                this.core.onCollision();
                return;
            }
        }
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pwp = this.powerups[i];
            if (this.player.position.distanceTo(pwp.position) < 1.5) {
                this.scene.remove(pwp);
                this.powerups.splice(i, 1);
                this.core.onPowerup(pwp.userData.type);
            }
        }
    }
    
    updateCamera() {
        if (this.cameraShake.time > 0) {
            this.cameraShake.time -= 1;
            const shakeAmount = this.cameraShake.intensity * (this.cameraShake.time / this.cameraShake.duration);
            this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
            this.camera.position.y = 4 + (Math.random() - 0.5) * shakeAmount;
        } else {
            this.camera.position.x += (0 - this.camera.position.x) * 0.1;
            this.camera.position.y += (4 - this.camera.position.y) * 0.1;
        }
    }
    
    triggerShake(intensity = 0.3, duration = 20) { this.cameraShake = { intensity, duration, time: duration }; }
    playerMove(direction) { this.currentLane = Math.max(0, Math.min(2, this.currentLane + direction)); }
    playerJump() { if (!this.state.isJumping && !this.state.isFlipping) { this.state.isJumping = true; this.physics.velocityY = 0.45; } }
    playerFlip() { if (!this.state.isFlipping) { this.state.isFlipping = true; this.physics.velocityY = 0.55; this.player.rotation.x = 0; } }
    playerSlide() { if (!this.state.isSliding) { this.state.isSliding = true; setTimeout(() => this.state.isSliding = false, 600); } }
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- CORE GAME LOGIC ---
class CoreGame {
    constructor(enhancer) {
        this.status = 'menu';
        this.godMode = false;
        this.soundDesign = enhancer.soundDesign;
        this.loadData();
        this.engine = new Game3D(this);
        ui.setup(this, enhancer);
        ui.showScreen('age-warning');
    }

    start() {
        this.soundDesign.playUISound('game_start');
        this.status = 'playing';
        this.score = 0;
        this.lives = 3;
        this.powerup = { shield: false };
        if (this.shieldVisual) this.engine.player.remove(this.shieldVisual);
        this.combo = { count: 1, timer: 0 };
        this.gestureBuffer = [];
        this.flipCooldown = false;
        this.lastTime = 0;
        this.gameStats = { flips: 0, noHitTimer: 0, untouchableUnlocked: false };
        this.engine.reset();
        ui.showScreen('game');
        ui.showToast(this.godMode ? 'God Mode aktivní!' : 'Tak pojď, Pedro!', 2000);
        this.lastTime = performance.now();
        this.runLoop(this.lastTime);
    }

    onCollision() {
        if (this.godMode) return;
        this.soundDesign.playUISound('collision');
        if(this.powerup.shield) {
            this.powerup.shield = false;
            if(this.shieldVisual) this.engine.player.remove(this.shieldVisual);
            ui.showToast('Štít zničen!');
            navigator.vibrate?.([50, 50, 50]);
            return;
        }
        this.lives--;
        this.combo.count = 1;
        this.gameStats.noHitTimer = 0;
        navigator.vibrate?.(100);
        this.engine.triggerShake();
        ui.showToast(`Tak to bolelo! Zbývají ${this.lives} životy.`);
        if (this.lives <= 0) this.gameOver('Příliš mnoho kolizí!');
    }

    onPowerup(type) {
        this.soundDesign.playUISound('powerup');
        if(type === 'shield' && !this.powerup.shield) {
            this.powerup.shield = true;
            this.shieldVisual = new THREE.Mesh(
                new THREE.SphereGeometry(1, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x4ecdc4, transparent: true, opacity: 0.3 })
            );
            this.engine.player.add(this.shieldVisual);
            setTimeout(() => {
                this.powerup.shield = false;
                if(this.shieldVisual) this.engine.player.remove(this.shieldVisual);
            }, 10000);
            ui.showToast('Tohle pomůže! Štít aktivní.');
            navigator.vibrate?.(50);
        }
    }

    onSwipe(direction) {
         if (direction === 'up') {
            const now = Date.now();
            this.gestureBuffer = this.gestureBuffer.filter(ts => now - ts < 300);
            this.gestureBuffer.push(now);
            
            if (this.gestureBuffer.length >= 2 && !this.flipCooldown) {
                this.engine.playerFlip();
                this.soundDesign.playUISound('flip');
                this.gameStats.flips++;
                this.flipCooldown = true;
                this.combo.count++;
                this.combo.timer = 2;
                this.score += 500 * this.combo.count;
                ui.showToast(`Hezký, přes překážku! +${500 * this.combo.count}`, 1000);
                setTimeout(() => this.flipCooldown = false, 500);
                navigator.vibrate?.([20, 80]);
            } else {
                this.engine.playerJump();
            }
        } else if (direction === 'down') {
            this.engine.playerSlide();
        } else if (direction === 'left') {
            this.engine.playerMove(-1);
        } else if (direction === 'right') {
            this.engine.playerMove(1);
        }
    }
    
     loadData() {
        const data = JSON.parse(localStorage.getItem('pedro-runner-data') || '{}');
        this.bestScore = data.bestScore || 0;
        this.achievements = {
            unlocked: new Set(data.achievements || []),
            definitions: {
                'ACROBAT': { title: 'Akrobat', description: 'Udělej 10 flipů v jedné hře.' },
                'MARATHONEC': { title: 'Maratonec', description: 'Dosáhni skóre 10000.' },
                'NEDOTKNUTELNY': { title: 'Nedotknutelný', description: 'Přežij 2 minuty bez zásahu.' }
            }
        };
    }

    saveData() {
        const data = {
            bestScore: this.bestScore,
            achievements: Array.from(this.achievements.unlocked)
        };
        localStorage.setItem('pedro-runner-data', JSON.stringify(data));
    }
    pause() { if (this.status === 'playing') { this.status = 'paused'; ui.showScreen('pause-screen'); } }
    resume() {
        if (this.status === 'paused') {
            this.status = 'playing';
            ui.showScreen('game');
            this.lastTime = performance.now();
            this.runLoop(this.lastTime);
        }
    }

    runLoop(time) {
        if (this.status !== 'playing') return;
        const deltaTime = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;
        this.engine.update(deltaTime);
        this.score += Math.floor(this.engine.gameSpeed * 10 * this.combo.count);
        this.combo.timer = Math.max(0, this.combo.timer - deltaTime);
        if(this.combo.timer === 0) this.combo.count = 1;
        this.gameStats.noHitTimer += deltaTime;
        this.checkAchievementsLive();
        ui.updateHUD(this);
        requestAnimationFrame((t) => this.runLoop(t));
    }
    
    activateGodMode() {
        this.godMode = !this.godMode;
        ui.showToast(`God Mode ${this.godMode ? 'aktivován' : 'deaktivován'}!`, 3000);
        ui.updateHUD(this);
    }

    gameOver(cause) {
        this.status = 'gameover';
        navigator.vibrate?.(200);
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            ui.showToast('Nový rekord!', 3000);
        }
        this.saveData();
        ui.updateGameOver(this, cause);
    }

    backToMenu() { this.status = 'menu'; ui.showScreen('main-menu'); }

    checkAchievementsLive() {
        if (this.gameStats.flips >= 10 && !this.achievements.unlocked.has('ACROBAT')) {
            this.achievements.unlocked.add('ACROBAT');
            ui.showToast('ÚSPĚCH: Akrobat!', 3000);
        }
        if (this.score >= 10000 && !this.achievements.unlocked.has('MARATHONEC')) {
            this.achievements.unlocked.add('MARATHONEC');
            ui.showToast('ÚSPĚCH: Maratonec!', 3000);
        }
        if (this.gameStats.noHitTimer >= 120 && !this.achievements.unlocked.has('NEDOTKNUTELNY')) {
            this.achievements.unlocked.add('NEDOTKNUTELNY');
            ui.showToast('ÚSPĚCH: Nedotknutelný!', 3000);
        }
    }
}

// Initialize the game with the enhancer
const enhancer = new UIEnhancer();
window.game = new CoreGame(enhancer);
