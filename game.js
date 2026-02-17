// Battleships Forever - HTML5 Space RTS Edition
// A web-based recreation inspired by the original Battleships Forever

// Game constants
const SCREEN_SHAKE_INTENSITY = 0.05;
const MAX_SCREEN_SHAKE = 10;
const SCREEN_SHAKE_DECAY = 0.9;
const DEFAULT_SCROLL_SPEED = 20; // Match original bfdefault.ini

// Audio System
class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.currentMusicTrack = null;
        this.soundVolume = 0.9; // Match original default SFXVol = 0.9
        this.musicVolume = 0.4; // Match original default MusicVol = 40 (0.4)
        this.enabled = true;
        this.musicEnabled = true;
    }
    
    loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.volume = this.soundVolume;
            audio.preload = 'auto';
            this.sounds[name] = audio;
        } catch (e) {
            console.warn(`Could not load sound: ${path}`, e);
        }
    }
    
    playSound(name) {
        if (!this.enabled || !this.sounds[name]) return;
        try {
            const sound = this.sounds[name].cloneNode();
            sound.volume = this.soundVolume;
            sound.play().catch(e => console.warn(`Could not play sound: ${name}`, e));
        } catch (e) {
            console.warn(`Error playing sound: ${name}`, e);
        }
    }
    
    playMusic(trackName, loop = true) {
        if (!this.musicEnabled) return;
        
        // Stop current music if playing
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
        
        const musicPath = `ORIGINAL/${trackName}`;
        this.music = new Audio(musicPath);
        this.music.volume = this.musicVolume;
        this.music.loop = loop;
        this.currentMusicTrack = trackName;
        
        this.music.play().catch(e => {
            console.warn(`Could not play music: ${trackName}`, e);
        });
    }
    
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
            this.currentMusicTrack = null;
        }
    }
    
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.soundVolume;
        });
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }
    
    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled && this.currentMusicTrack) {
            this.playMusic(this.currentMusicTrack);
        } else if (!this.musicEnabled) {
            this.stopMusic();
        }
        return this.musicEnabled;
    }
}

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2(0, 0);
        return new Vector2(this.x / len, this.y / len);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

class ShipSection {
    constructor(type, size, x, y) {
        this.type = type;
        this.size = size || 'medium';
        this.localX = x;
        this.localY = y;
        this.health = 100;
        this.maxHealth = 100;
        this.sprite = null;
        this.spriteFile = null;
        this.partId = null;
        this.mass = 10;
        
        // Different properties based on type
        switch(type) {
            case 'core':
                this.health = size === 'large' ? 200 : size === 'medium' ? 150 : 100;
                this.color = '#00ff00';
                this.radius = size === 'large' ? 30 : size === 'medium' ? 20 : 15;
                break;
            case 'cannon':
                this.color = '#ff4400';
                this.radius = 12;
                this.fireRate = 500; // ms
                this.lastFired = 0;
                this.damage = 20;
                break;
            case 'laser':
                this.color = '#00ffff';
                this.radius = 10;
                this.fireRate = 200;
                this.lastFired = 0;
                this.damage = 10;
                break;
            case 'missile':
                this.color = '#ffff00';
                this.radius = 15;
                this.fireRate = 2000;
                this.lastFired = 0;
                this.damage = 50;
                break;
            case 'railgun':
                this.color = '#ff00ff';
                this.radius = 8;
                this.fireRate = 1500;
                this.lastFired = 0;
                this.damage = 40;
                break;
            case 'engine':
                this.color = '#0088ff';
                this.radius = 12;
                this.thrust = 50;
                break;
            case 'shield':
                this.color = '#88ccff';
                this.radius = 15;
                this.shieldStrength = 50;
                break;
            case 'armor':
                this.color = '#888888';
                this.radius = 12;
                this.armorValue = 30;
                break;
            case 'structure':
                this.color = '#666666';
                this.radius = 10;
                break;
            case 'special':
                this.color = '#ffaa00';
                this.radius = 12;
                break;
            default:
                this.color = '#666666';
                this.radius = 10;
        }
        
        this.maxHealth = this.health;
    }
}

class Ship {
    constructor(x, y, team = 'player') {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.angle = 0;
        this.angularVelocity = 0;
        this.team = team;
        this.selected = false;
        this.sections = [];
        this.targetPosition = null;
        this.targetEnemy = null;
        
        // Team colors based on original game's bfdefault.ini
        this.teamColors = {
            player: {
                primary: 'rgb(0, 255, 0)',    // Green
                secondary: 'rgb(64, 255, 64)',
                tertiary: 'rgb(128, 255, 128)'
            },
            enemy: {
                primary: 'rgb(255, 0, 0)',    // Red (Pirate)
                secondary: 'rgb(255, 64, 64)',
                tertiary: 'rgb(155, 45, 45)'
            },
            alien: {
                primary: 'rgb(255, 0, 255)',  // Magenta
                secondary: 'rgb(128, 0, 255)',
                tertiary: 'rgb(255, 128, 255)'
            },
            allied: {
                primary: 'rgb(0, 255, 255)',  // Cyan/Yellow
                secondary: 'rgb(64, 128, 128)',
                tertiary: 'rgb(128, 196, 196)'
            },
            razor: {  // Razor Aliens - White
                primary: 'rgb(255, 255, 255)',
                secondary: 'rgb(255, 255, 255)',
                tertiary: 'rgb(255, 255, 255)'
            }
        };
        
        // Pirate is an alias for enemy faction
        this.teamColors.pirate = this.teamColors.enemy;
        
        // Add a default core section
        this.addSection(new ShipSection('core', 'medium', 0, 0));
        
        // Ship properties (calculated from sections)
        this.updateProperties();
    }
    
    addSection(section) {
        // Apply team colors to core sections
        if (section.type === 'core') {
            const teamColor = this.teamColors[this.team] || this.teamColors.player;
            section.color = teamColor.primary;
        }
        this.sections.push(section);
        this.updateProperties();
    }
    
    updateProperties() {
        // Calculate total mass, thrust, health, etc from sections
        this.totalMass = this.sections.length * 10;
        this.totalThrust = this.sections
            .filter(s => s.type === 'engine')
            .reduce((sum, s) => sum + (s.thrust || 0), 50); // base thrust
        
        this.maxHealth = this.sections.reduce((sum, s) => sum + s.maxHealth, 0);
        this.health = this.sections.reduce((sum, s) => sum + s.health, 0);
        
        this.alive = this.health > 0;
    }
    
    update(dt, ships, projectiles, audio, difficulty = 'normal') {
        if (!this.alive) return;
        
        // Difficulty modifiers
        const difficultySettings = {
            easy: { aimAccuracy: 0.5, fireDistance: 350, rotationSpeed: 0.05 },
            normal: { aimAccuracy: 0.3, fireDistance: 400, rotationSpeed: 0.08 },
            hard: { aimAccuracy: 0.15, fireDistance: 450, rotationSpeed: 0.12 }
        };
        const settings = difficultySettings[difficulty] || difficultySettings.normal;
        
        // AI behavior for enemy ships
        if (this.team === 'enemy' && !this.targetEnemy) {
            const playerShips = ships.filter(s => s.team === 'player' && s.alive);
            if (playerShips.length > 0) {
                // Find nearest player ship
                let nearest = null;
                let minDist = Infinity;
                for (const ship of playerShips) {
                    const dist = this.position.subtract(ship.position).length();
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = ship;
                    }
                }
                this.targetEnemy = nearest;
            }
        }
        
        // Move towards target
        if (this.targetPosition) {
            const toTarget = this.targetPosition.subtract(this.position);
            const distance = toTarget.length();
            
            if (distance > 10) {
                const direction = toTarget.normalize();
                const force = direction.multiply(this.totalThrust / this.totalMass);
                this.velocity = this.velocity.add(force.multiply(dt));
                
                // Rotate towards movement direction
                const targetAngle = Math.atan2(direction.y, direction.x);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                this.angle += angleDiff * 0.05;
            } else {
                this.targetPosition = null;
            }
        }
        
        // Attack target enemy
        if (this.targetEnemy && this.targetEnemy.alive) {
            const toEnemy = this.targetEnemy.position.subtract(this.position);
            const distance = toEnemy.length();
            
            // Rotate to face enemy (speed based on difficulty)
            const targetAngle = Math.atan2(toEnemy.y, toEnemy.x);
            let angleDiff = targetAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            this.angle += angleDiff * settings.rotationSpeed;
            
            // Fire weapons if in range and facing target (accuracy based on difficulty)
            if (distance < settings.fireDistance && Math.abs(angleDiff) < settings.aimAccuracy) {
                this.fireWeapons(projectiles, Date.now(), audio);
            }
            
            // Move towards enemy if too far
            if (distance > 300) {
                this.targetPosition = this.targetEnemy.position;
            }
        } else if (this.targetEnemy) {
            this.targetEnemy = null;
        }
        
        // Apply drag
        this.velocity = this.velocity.multiply(0.98);
        
        // Update position
        this.position = this.position.add(this.velocity.multiply(dt));
        
        // Update angle
        this.angle += this.angularVelocity * dt;
        this.angularVelocity *= 0.95;
        
        this.updateProperties();
    }
    
    fireWeapons(projectiles, currentTime, audio) {
        for (const section of this.sections) {
            if (['cannon', 'laser', 'missile', 'railgun'].includes(section.type)) {
                if (currentTime - section.lastFired > section.fireRate) {
                    section.lastFired = currentTime;
                    
                    // Play weapon sound effect
                    if (audio) {
                        audio.playSound(section.type);
                    }
                    
                    // Calculate weapon position in world space
                    const rotated = new Vector2(section.localX, section.localY).rotate(this.angle);
                    const worldPos = this.position.add(rotated);
                    
                    // Store muzzle flash for visual effect
                    section.muzzleFlash = {
                        time: currentTime,
                        duration: 100 // ms
                    };
                    
                    // Create projectile
                    const projectile = {
                        position: worldPos,
                        velocity: new Vector2(Math.cos(this.angle), Math.sin(this.angle))
                            .multiply(section.type === 'missile' ? 150 : section.type === 'railgun' ? 500 : 300),
                        damage: section.damage,
                        type: section.type,
                        team: this.team,
                        life: section.type === 'laser' ? 0.5 : 2,
                        createdAt: currentTime / 1000,
                        angle: this.angle,
                        owner: this
                    };
                    
                    // Special handling for missiles - add homing capability
                    if (section.type === 'missile') {
                        projectile.homing = true;
                        projectile.target = null;
                        projectile.turnRate = 0.05; // radians per frame
                    }
                    
                    // Railgun can penetrate
                    if (section.type === 'railgun') {
                        projectile.penetration = true;
                        projectile.hitTargets = [];
                    }
                    
                    projectiles.push(projectile);
                }
            }
        }
    }
    
    takeDamage(damage, audio) {
        if (this.sections.length === 0) {
            this.alive = false;
            return;
        }
        
        // Damage a random section
        const section = this.sections[Math.floor(Math.random() * this.sections.length)];
        section.health -= damage;
        
        if (section.health <= 0) {
            // Remove destroyed section
            const index = this.sections.indexOf(section);
            this.sections.splice(index, 1);
            
            // Play explosion sound (randomize for variety)
            if (audio) {
                const explosionSounds = ['explosion', 'explosion1', 'explosion2', 'explosion3'];
                const randomSound = explosionSounds[Math.floor(Math.random() * explosionSounds.length)];
                audio.playSound(randomSound);
            }
            
            // If core is destroyed or no sections left, ship is destroyed
            if (this.sections.length === 0 || !this.sections.some(s => s.type === 'core')) {
                this.alive = false;
            }
        }
        
        this.updateProperties();
    }
    
    draw(ctx, camera, displaySettings = null) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(
            this.position.x - camera.x,
            this.position.y - camera.y
        );
        ctx.rotate(this.angle);
        
        // Draw sections
        for (const section of this.sections) {
            // Draw sprite if available
            if (section.sprite && section.sprite.complete) {
                ctx.save();
                ctx.translate(section.localX, section.localY);
                const scale = (section.radius * 2) / Math.max(section.sprite.width, section.sprite.height);
                ctx.drawImage(
                    section.sprite,
                    -section.sprite.width * scale / 2,
                    -section.sprite.height * scale / 2,
                    section.sprite.width * scale,
                    section.sprite.height * scale
                );
                ctx.restore();
            } else {
                // Fallback to circle rendering
                // Section glow
                const gradient = ctx.createRadialGradient(
                    section.localX, section.localY, 0,
                    section.localX, section.localY, section.radius
                );
                
                // Ensure color has proper format for alpha channel
                const baseColor = section.color;
                const alphaColor1 = baseColor + (baseColor.length === 7 ? '88' : '');
                const alphaColor2 = baseColor + (baseColor.length === 7 ? '00' : '');
                
                gradient.addColorStop(0, baseColor);
                gradient.addColorStop(0.7, alphaColor1);
                gradient.addColorStop(1, alphaColor2);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(section.localX, section.localY, section.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Section outline
                ctx.strokeStyle = section.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(section.localX, section.localY, section.radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Draw muzzle flash for weapons that just fired
            if (section.muzzleFlash && ['cannon', 'laser', 'missile', 'railgun'].includes(section.type)) {
                const elapsed = Date.now() - section.muzzleFlash.time;
                if (elapsed < section.muzzleFlash.duration) {
                    const alpha = 1 - (elapsed / section.muzzleFlash.duration);
                    const flashSize = section.radius * 1.5;
                    
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.8;
                    
                    const flashGradient = ctx.createRadialGradient(
                        section.localX, section.localY, 0,
                        section.localX, section.localY, flashSize
                    );
                    
                    const flashColor = section.type === 'laser' ? '#00ffff' :
                                      section.type === 'missile' ? '#ffff00' :
                                      section.type === 'railgun' ? '#ff00ff' : '#ff8800';
                    
                    flashGradient.addColorStop(0, flashColor);
                    flashGradient.addColorStop(0.5, flashColor + '88');
                    flashGradient.addColorStop(1, flashColor + '00');
                    
                    ctx.fillStyle = flashGradient;
                    ctx.beginPath();
                    ctx.arc(section.localX, section.localY, flashSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
            
            // Health bar for damaged sections
            if (section.health < section.maxHealth) {
                const barWidth = section.radius * 2;
                const barHeight = 3;
                const barX = section.localX - barWidth / 2;
                const barY = section.localY - section.radius - 8;
                
                ctx.fillStyle = '#330000';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                ctx.fillStyle = '#ff0000';
                const healthWidth = (section.health / section.maxHealth) * barWidth;
                ctx.fillRect(barX, barY, healthWidth, barHeight);
            }
        }
        
        // Selection indicator
        if (this.selected) {
            const teamColor = this.teamColors[this.team] || this.teamColors.player;
            ctx.strokeStyle = teamColor.primary;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            const size = Math.max(...this.sections.map(s => 
                Math.sqrt(s.localX * s.localX + s.localY * s.localY) + s.radius
            ));
            ctx.beginPath();
            ctx.arc(0, 0, size + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Shield visualization
        const shieldSections = this.sections.filter(s => s.type === 'shield');
        if (shieldSections.length > 0) {
            const totalShield = shieldSections.reduce((sum, s) => sum + (s.shieldStrength || 0), 0);
            if (totalShield > 0) {
                const size = Math.max(...this.sections.map(s => 
                    Math.sqrt(s.localX * s.localX + s.localY * s.localY) + s.radius
                )) + 15;
                
                // Animated shield effect (with shimmer if enabled)
                const time = Date.now() / 1000;
                const shimmer = (displaySettings && displaySettings.shimmer) ? 
                    (Math.sin(time * 2) * 0.1 + 0.9) : 1.0;
                
                ctx.strokeStyle = `rgba(136, 204, 255, ${0.3 * shimmer})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Shield glow (with gradient if enabled)
                if (!displaySettings || displaySettings.gradients) {
                    ctx.save();
                    ctx.globalAlpha = 0.1 * shimmer;
                    const shieldGradient = ctx.createRadialGradient(0, 0, size - 10, 0, 0, size);
                    shieldGradient.addColorStop(0, '#88ccff00');
                    shieldGradient.addColorStop(0.8, '#88ccff88');
                    shieldGradient.addColorStop(1, '#88ccff00');
                    ctx.fillStyle = shieldGradient;
                    ctx.beginPath();
                    ctx.arc(0, 0, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
        
        ctx.restore();
    }
}

class BattleshipsForeverGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.camera = new Vector2(0, 0);
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        
        this.selectedShips = [];
        this.shipBuilderActive = false;
        this.selectedSection = null;
        this.currentShipDesign = [];
        this.shipEditor = null;
        
        this.keys = {};
        this.mouse = new Vector2(0, 0);
        
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        // Game state
        this.paused = false;
        this.inGame = false;
        this.difficulty = 'normal';
        this.gameMode = 'sandbox'; // sandbox, skirmish
        
        // Skirmish mode state
        this.wave = 0;
        this.enemiesRemaining = 0;
        this.score = 0;
        this.waveActive = false;
        
        // Screen effects
        this.screenShake = 0;
        
        // Display settings (matching original bfdefault.ini)
        this.displaySettings = {
            particles: true,
            gradients: true,
            shimmer: true,
            doodads: true,
            interpolation: true,
            scrollSpeed: DEFAULT_SCROLL_SPEED
        };
        
        // Initialize space doodads (asteroids, debris)
        this.doodads = [];
        this.initializeDoodads();
        
        // Initialize audio manager
        this.audio = new AudioManager();
        this.loadAudio();
        
        this.setupEventListeners();
        this.initializeShipEditor();
        this.setupShipBuilder();
        
        // Show main menu initially
        this.showMainMenu();
        
        this.gameLoop();
    }
    
    showMainMenu() {
        this.inGame = false;
        this.paused = false;
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('ui').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('pauseMenu').classList.remove('active');
        this.audio.playMusic('Thememusic.ogg');
    }
    
    initializeDoodads() {
        // Create space doodads (asteroids, debris) scattered across the playfield
        const doodadTypes = [
            { type: 'asteroid1', size: 15, color: '#666666' },
            { type: 'asteroid2', size: 25, color: '#777777' },
            { type: 'asteroid3', size: 20, color: '#555555' },
            { type: 'debris1', size: 10, color: '#888888' },
            { type: 'debris2', size: 8, color: '#999999' }
        ];
        
        // Spawn doodads in a large area around origin
        for (let i = 0; i < 30; i++) {
            const type = doodadTypes[Math.floor(Math.random() * doodadTypes.length)];
            const doodad = {
                x: (Math.random() - 0.5) * 3000,
                y: (Math.random() - 0.5) * 3000,
                size: type.size,
                color: type.color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                type: type.type,
                parallax: 0.3 + Math.random() * 0.3 // Parallax factor for depth
            };
            
            // Pre-calculate asteroid shape to avoid flickering
            if (doodad.type.startsWith('asteroid')) {
                const sides = 6 + Math.floor(Math.random() * 2);
                doodad.vertices = [];
                for (let j = 0; j < sides; j++) {
                    const angle = (j / sides) * Math.PI * 2;
                    const radius = doodad.size * (0.8 + Math.random() * 0.4);
                    doodad.vertices.push({
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius
                    });
                }
            }
            
            this.doodads.push(doodad);
        }
    }
    
    startGame(mode = 'sandbox') {
        this.audio.playSound('buttonClick');
        this.inGame = true;
        this.paused = false;
        this.gameMode = mode;
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('ui').style.display = 'flex';
        document.getElementById('instructions').style.display = 'block';
        this.audio.playMusic('Combatmusic.ogg');
        
        // Initialize game mode
        if (mode === 'skirmish') {
            this.startSkirmish();
        }
    }
    
    startSkirmish() {
        // Reset skirmish state
        this.wave = 0;
        this.score = 0;
        this.enemiesRemaining = 0;
        this.waveActive = false;
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        
        // Spawn player ship
        const playerShip = new Ship(
            this.canvas.width / 2 + this.camera.x,
            this.canvas.height / 2 + this.camera.y,
            'player'
        );
        playerShip.addSection(new ShipSection('cannon', 'medium', 30, 0));
        playerShip.addSection(new ShipSection('cannon', 'medium', -30, 0));
        playerShip.addSection(new ShipSection('laser', 'medium', 0, 30));
        playerShip.addSection(new ShipSection('engine', 'medium', 0, -30));
        this.ships.push(playerShip);
        
        // Start first wave
        this.nextWave();
        this.updateUI();
    }
    
    nextWave() {
        this.wave++;
        this.waveActive = true;
        
        // Spawn enemies based on wave number
        const enemyCount = Math.min(2 + this.wave, 10);
        const factions = ['enemy', 'pirate', 'alien', 'razor'];
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const faction = factions[Math.floor(Math.random() * factions.length)];
                this.spawnEnemyShip(faction);
                this.enemiesRemaining++;
            }, i * 1000); // Spawn one enemy per second
        }
        
        this.audio.playSound('deploy');
    }
    
    checkSkirmishWave() {
        if (this.gameMode !== 'skirmish' || !this.waveActive) return;
        
        // Count remaining enemies
        const enemyCount = this.ships.filter(s => s.alive && s.team !== 'player').length;
        
        // Check if all enemies are defeated
        if (enemyCount === 0 && this.enemiesRemaining > 0) {
            // Wave complete
            this.waveActive = false;
            this.enemiesRemaining = 0; // Reset for next wave
            const bonus = this.wave * 100;
            this.score += bonus;
            
            // Show wave complete message
            document.getElementById('waveBonus').textContent = bonus;
            const waveCompleteEl = document.getElementById('waveComplete');
            waveCompleteEl.style.display = 'block';
            
            // Wait 3 seconds before next wave
            setTimeout(() => {
                waveCompleteEl.style.display = 'none';
                if (this.gameMode === 'skirmish' && this.inGame) {
                    this.nextWave();
                }
            }, 3000);
        }
        
        // Check if player is dead
        const playerAlive = this.ships.some(s => s.alive && s.team === 'player');
        if (!playerAlive) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.inGame = false;
        this.paused = true;
        
        // Show game over screen
        document.getElementById('finalWave').textContent = this.wave;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('ui').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        
        this.audio.stopMusic();
    }
    
    showOptions() {
        this.audio.playSound('buttonClick');
        document.getElementById('optionsMenu').classList.add('active');
    }
    
    closeOptions() {
        this.audio.playSound('buttonClick');
        document.getElementById('optionsMenu').classList.remove('active');
    }
    
    pauseGame() {
        if (!this.inGame) return;
        this.paused = true;
        document.getElementById('pauseMenu').classList.add('active');
    }
    
    resumeGame() {
        this.audio.playSound('buttonClick');
        this.paused = false;
        document.getElementById('pauseMenu').classList.remove('active');
    }
    
    returnToMainMenu() {
        this.audio.playSound('buttonClick');
        document.getElementById('pauseMenu').classList.remove('active');
        this.reset();
        this.showMainMenu();
    }
    
    setSFXVolume(value) {
        this.audio.setSoundVolume(value / 100);
        document.getElementById('sfxValue').textContent = value + '%';
    }
    
    setMusicVolume(value) {
        this.audio.setMusicVolume(value / 100);
        document.getElementById('musicValue').textContent = value + '%';
    }
    
    setDifficulty(diff) {
        this.difficulty = diff;
        this.audio.playSound('buttonClick');
    }
    
    setScrollSpeed(value) {
        this.displaySettings.scrollSpeed = parseInt(value);
        document.getElementById('scrollSpeedValue').textContent = value;
    }
    
    toggleParticles(enabled) {
        this.displaySettings.particles = enabled;
        this.audio.playSound('buttonClick');
    }
    
    toggleGradients(enabled) {
        this.displaySettings.gradients = enabled;
        this.audio.playSound('buttonClick');
    }
    
    toggleShimmer(enabled) {
        this.displaySettings.shimmer = enabled;
        this.audio.playSound('buttonClick');
    }
    
    toggleDoodads(enabled) {
        this.displaySettings.doodads = enabled;
        this.audio.playSound('buttonClick');
    }
    
    toggleInterpolation(enabled) {
        this.displaySettings.interpolation = enabled;
        this.audio.playSound('buttonClick');
    }
    
    loadAudio() {
        // Load weapon firing sound effects
        this.audio.loadSound('cannon', 'ORIGINAL/Sounds/snd_Blaster.wav');
        this.audio.loadSound('laser', 'ORIGINAL/Sounds/snd_BeamFire1.wav');
        this.audio.loadSound('missile', 'ORIGINAL/Sounds/snd_MissileLaunch.wav');
        this.audio.loadSound('railgun', 'ORIGINAL/Sounds/snd_Dieterling.wav');
        
        // Load explosion sound effects
        this.audio.loadSound('explosion', 'ORIGINAL/Sounds/snd_ExpShockwave.wav');
        this.audio.loadSound('explosion1', 'ORIGINAL/Sounds/snd_FlashBoltExplode.wav');
        this.audio.loadSound('explosion2', 'ORIGINAL/Sounds/snd_FlashBoltExplode2.wav');
        this.audio.loadSound('explosion3', 'ORIGINAL/Sounds/snd_RAShellExplode.wav');
        
        // Load UI sound effects
        this.audio.loadSound('buttonClick', 'ORIGINAL/Sounds/snd_ClickButton.wav');
        this.audio.loadSound('selectShip', 'ORIGINAL/Sounds/snd_ChooseShip.wav');
        this.audio.loadSound('deploy', 'ORIGINAL/Sounds/snd_DeployPlatform.wav');
        
        // Music will be started by menu system
    }
    
    async initializeShipEditor() {
        this.shipEditor = new ShipEditor(this);
        await this.shipEditor.initialize();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Escape key to pause/unpause
            if (e.key === 'Escape') {
                e.preventDefault();
                if (this.inGame) {
                    if (this.paused) {
                        this.resumeGame();
                    } else {
                        this.pauseGame();
                    }
                }
            }
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.selectedShips.length > 0) {
                    const now = Date.now();
                    this.selectedShips.forEach(ship => {
                        ship.fireWeapons(this.projectiles, now, this.audio);
                    });
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        this.canvas.addEventListener('click', (e) => {
            // If in ship builder mode and a part is selected, place it
            if (this.shipBuilderActive && this.shipEditor && this.shipEditor.selectedPart) {
                const canvasPos = new Vector2(e.clientX, e.clientY);
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const localX = canvasPos.x - centerX;
                const localY = canvasPos.y - centerY;
                
                this.shipEditor.addPartToShip(this.shipEditor.selectedPart, localX, localY);
                return;
            }
            
            const worldPos = new Vector2(
                e.clientX + this.camera.x,
                e.clientY + this.camera.y
            );
            
            if (!e.shiftKey) {
                this.selectedShips.forEach(s => s.selected = false);
                this.selectedShips = [];
            }
            
            // Check if clicking on a ship
            let clicked = false;
            for (const ship of this.ships) {
                if (!ship.alive) continue;
                
                const dist = ship.position.subtract(worldPos).length();
                if (dist < 50) {
                    ship.selected = !ship.selected;
                    if (ship.selected && !this.selectedShips.includes(ship)) {
                        this.selectedShips.push(ship);
                        this.audio.playSound('selectShip');
                    } else {
                        const index = this.selectedShips.indexOf(ship);
                        if (index > -1) this.selectedShips.splice(index, 1);
                    }
                    clicked = true;
                    break;
                }
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const worldPos = new Vector2(
                e.clientX + this.camera.x,
                e.clientY + this.camera.y
            );
            
            // Issue move order to selected ships
            this.selectedShips.forEach(ship => {
                ship.targetPosition = worldPos;
            });
        });
    }
    
    setupShipBuilder() {
        document.querySelectorAll('.section-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                this.selectedSection = {
                    type: btn.dataset.type,
                    size: btn.dataset.size || 'medium'
                };
            });
        });
    }
    
    toggleShipBuilder() {
        this.audio.playSound('buttonClick');
        const builder = document.getElementById('shipBuilder');
        builder.classList.toggle('active');
        this.shipBuilderActive = builder.classList.contains('active');
    }
    
    spawnPlayerShip() {
        this.audio.playSound('deploy');
        
        let ship;
        
        // Check if ship editor has a design
        if (this.shipEditor && this.shipEditor.currentShip.sections.length > 0) {
            ship = this.shipEditor.createShipFromDesign(
                this.canvas.width / 2 + this.camera.x,
                this.canvas.height / 2 + this.camera.y,
                'player'
            );
        } else {
            ship = new Ship(
                this.canvas.width / 2 + this.camera.x,
                this.canvas.height / 2 + this.camera.y,
                'player'
            );
            
            // Add some default weapons and systems
            ship.addSection(new ShipSection('cannon', 'medium', 30, 0));
            ship.addSection(new ShipSection('cannon', 'medium', -30, 0));
            ship.addSection(new ShipSection('engine', 'medium', 0, 30));
            ship.addSection(new ShipSection('shield', 'medium', 0, -30));
        }
        
        this.ships.push(ship);
        this.updateUI();
    }
    
    spawnEnemyShip(team = 'enemy') {
        this.audio.playSound('deploy');
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 500;
        
        const ship = new Ship(
            this.canvas.width / 2 + this.camera.x + Math.cos(angle) * distance,
            this.canvas.height / 2 + this.camera.y + Math.sin(angle) * distance,
            team
        );
        
        // Enemy ship configuration varies by faction
        const weaponConfigs = {
            enemy: ['laser', 'laser', 'missile'],
            pirate: ['cannon', 'cannon', 'railgun'],
            alien: ['laser', 'missile', 'missile'],
            razor: ['railgun', 'railgun', 'laser'],
            allied: ['cannon', 'laser', 'missile']
        };
        
        const weapons = weaponConfigs[team] || weaponConfigs.enemy;
        ship.addSection(new ShipSection(weapons[0], 'medium', 25, 0));
        ship.addSection(new ShipSection(weapons[1], 'medium', -25, 0));
        ship.addSection(new ShipSection(weapons[2], 'medium', 0, 25));
        ship.addSection(new ShipSection('engine', 'medium', 0, -25));
        
        this.ships.push(ship);
        this.updateUI();
    }
    
    reset() {
        this.audio.playSound('buttonClick');
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        this.selectedShips = [];
        this.camera = new Vector2(0, 0);
        this.updateUI();
    }
    
    saveCurrentShip() {
        if (this.shipEditor) {
            this.shipEditor.exportShipDesign();
        } else {
            alert('Ship editor is loading...');
        }
    }
    
    update(dt) {
        // Don't update game logic if paused
        if (this.paused) return;
        
        // Handle keyboard controls for selected ships
        if (this.selectedShips.length > 0) {
            let movement = new Vector2(0, 0);
            
            if (this.keys['w']) movement.y -= 1;
            if (this.keys['s']) movement.y += 1;
            if (this.keys['a']) movement.x -= 1;
            if (this.keys['d']) movement.x += 1;
            
            if (movement.length() > 0) {
                movement = movement.normalize().multiply(200 * dt);
                this.selectedShips.forEach(ship => {
                    if (ship.alive) {
                        ship.velocity = ship.velocity.add(movement);
                    }
                });
            }
            
            if (this.keys['q']) {
                this.selectedShips.forEach(ship => {
                    if (ship.alive) ship.angularVelocity -= 2 * dt;
                });
            }
            if (this.keys['e']) {
                this.selectedShips.forEach(ship => {
                    if (ship.alive) ship.angularVelocity += 2 * dt;
                });
            }
        }
        
        // Update ships
        this.ships.forEach(ship => ship.update(dt, this.ships, this.projectiles, this.audio, this.difficulty));
        
        // Update projectiles
        const currentTime = performance.now() / 1000;
        this.projectiles = this.projectiles.filter(proj => {
            // Homing missile logic
            if (proj.homing && proj.type === 'missile') {
                // Find a target if we don't have one
                if (!proj.target || !proj.target.alive) {
                    const enemyShips = this.ships.filter(s => s.alive && s.team !== proj.team);
                    if (enemyShips.length > 0) {
                        // Find nearest enemy
                        let nearest = null;
                        let minDist = Infinity;
                        for (const ship of enemyShips) {
                            const dist = proj.position.subtract(ship.position).length();
                            if (dist < minDist) {
                                minDist = dist;
                                nearest = ship;
                            }
                        }
                        proj.target = nearest;
                    }
                }
                
                // Turn towards target
                if (proj.target && proj.target.alive) {
                    const toTarget = proj.target.position.subtract(proj.position);
                    const targetAngle = Math.atan2(toTarget.y, toTarget.x);
                    // Efficient angle normalization
                    let angleDiff = ((targetAngle - proj.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
                    
                    proj.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), proj.turnRate);
                    
                    // Update velocity based on new angle
                    const speed = proj.velocity.length();
                    proj.velocity = new Vector2(Math.cos(proj.angle), Math.sin(proj.angle)).multiply(speed);
                }
            }
            
            proj.position = proj.position.add(proj.velocity.multiply(dt));
            
            // Check collision with ships
            for (const ship of this.ships) {
                if (!ship.alive || ship.team === proj.team) continue;
                
                // Skip if railgun already hit this target
                if (proj.penetration && proj.hitTargets.includes(ship)) continue;
                
                const dist = ship.position.subtract(proj.position).length();
                if (dist < 30) {
                    ship.takeDamage(proj.damage, this.audio);
                    
                    // Add screen shake on impact
                    this.screenShake = Math.min(this.screenShake + proj.damage * SCREEN_SHAKE_INTENSITY, MAX_SCREEN_SHAKE);
                    
                    // Create enhanced explosion particles (if enabled)
                    if (this.displaySettings.particles) {
                        const particleCount = proj.damage > 30 ? 20 : 15; // More particles for high damage
                        for (let i = 0; i < particleCount; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 50 + Math.random() * 150;
                            const size = 2 + Math.random() * 3;
                            this.particles.push({
                                position: proj.position,
                                velocity: new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
                                life: 0.5 + Math.random() * 0.3,
                                createdAt: currentTime,
                                size: size,
                                color: proj.type === 'laser' ? '#00ffff' : 
                                       proj.type === 'missile' ? '#ffff00' :
                                       proj.type === 'railgun' ? '#ff00ff' : '#ff8800'
                            });
                        }
                    }
                    
                    // Railgun penetrates, others are destroyed on hit
                    if (proj.penetration) {
                        proj.hitTargets.push(ship);
                        continue; // Don't remove projectile
                    } else {
                        return false;
                    }
                }
            }
            
            // Remove old projectiles
            return (currentTime - proj.createdAt) < proj.life;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.position = particle.position.add(particle.velocity.multiply(dt));
            particle.velocity = particle.velocity.multiply(0.95);
            return (currentTime - particle.createdAt) < particle.life;
        });
        
        // Camera follows selected ships
        if (this.selectedShips.length > 0) {
            let avgX = 0, avgY = 0;
            let count = 0;
            this.selectedShips.forEach(ship => {
                if (ship.alive) {
                    avgX += ship.position.x;
                    avgY += ship.position.y;
                    count++;
                }
            });
            if (count > 0) {
                const targetCameraX = avgX / count - this.canvas.width / 2;
                const targetCameraY = avgY / count - this.canvas.height / 2;
                // Use interpolation setting and scroll speed
                const smoothFactor = this.displaySettings.interpolation ? 
                    0.05 * (this.displaySettings.scrollSpeed / DEFAULT_SCROLL_SPEED) : 1.0;
                this.camera.x += (targetCameraX - this.camera.x) * smoothFactor;
                this.camera.y += (targetCameraY - this.camera.y) * smoothFactor;
            }
        }
        
        // Apply and decay screen shake
        if (this.screenShake > 0) {
            this.camera.x += (Math.random() - 0.5) * this.screenShake;
            this.camera.y += (Math.random() - 0.5) * this.screenShake;
            this.screenShake *= SCREEN_SHAKE_DECAY;
            if (this.screenShake < 0.1) this.screenShake = 0;
        }
        
        // Clean up dead ships from selection
        this.selectedShips = this.selectedShips.filter(s => s.alive);
        
        // Check skirmish mode wave progress
        if (this.gameMode === 'skirmish') {
            this.checkSkirmishWave();
        }
    }
    
    draw() {
        // Clear canvas with space background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (multi-layer parallax effect with pseudo-random distribution)
        // Far stars (slowest parallax, dimmer)
        this.ctx.fillStyle = '#444444';
        const STAR_SEED_X1 = 123;
        const STAR_SEED_Y1 = 456;
        for (let i = 0; i < 50; i++) {
            const x = (i * STAR_SEED_X1 + this.camera.x * 0.05) % this.canvas.width;
            const y = (i * STAR_SEED_Y1 + this.camera.y * 0.05) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Mid-distance stars
        this.ctx.fillStyle = '#888888';
        const STAR_SEED_X2 = 789;
        const STAR_SEED_Y2 = 321;
        for (let i = 0; i < 75; i++) {
            const x = (i * STAR_SEED_X2 + this.camera.x * 0.1) % this.canvas.width;
            const y = (i * STAR_SEED_Y2 + this.camera.y * 0.1) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Near stars (faster parallax, brighter)
        this.ctx.fillStyle = '#ffffff';
        const STAR_SEED_X3 = 234;
        const STAR_SEED_Y3 = 567;
        for (let i = 0; i < 50; i++) {
            const x = (i * STAR_SEED_X3 + this.camera.x * 0.2) % this.canvas.width;
            const y = (i * STAR_SEED_Y3 + this.camera.y * 0.2) % this.canvas.height;
            const size = (i % 3 === 0) ? 2 : 1; // Some stars slightly bigger
            this.ctx.fillRect(x, y, size, size);
        }
        
        // Draw space doodads (asteroids, debris) if enabled
        if (this.displaySettings.doodads) {
            this.doodads.forEach(doodad => {
                // Apply parallax effect for depth
                const screenX = doodad.x - this.camera.x * doodad.parallax;
                const screenY = doodad.y - this.camera.y * doodad.parallax;
                
                // Only draw if on screen (with margin)
                if (screenX > -100 && screenX < this.canvas.width + 100 &&
                    screenY > -100 && screenY < this.canvas.height + 100) {
                    
                    this.ctx.save();
                    this.ctx.translate(screenX, screenY);
                    this.ctx.rotate(doodad.rotation);
                    
                    // Draw based on type
                    if (doodad.type.startsWith('asteroid') && doodad.vertices) {
                        // Draw asteroid using pre-calculated vertices
                        this.ctx.fillStyle = doodad.color;
                        this.ctx.beginPath();
                        doodad.vertices.forEach((vertex, i) => {
                            if (i === 0) this.ctx.moveTo(vertex.x, vertex.y);
                            else this.ctx.lineTo(vertex.x, vertex.y);
                        });
                        this.ctx.closePath();
                        this.ctx.fill();
                        
                        // Add some detail lines
                        this.ctx.strokeStyle = '#444444';
                        this.ctx.lineWidth = 1;
                        this.ctx.stroke();
                    } else {
                        // Draw debris as small rectangles
                        this.ctx.fillStyle = doodad.color;
                        this.ctx.fillRect(-doodad.size/2, -doodad.size/2, doodad.size, doodad.size/2);
                    }
                    
                    this.ctx.restore();
                    
                    // Slowly rotate doodad
                    doodad.rotation += doodad.rotationSpeed;
                }
            });
        }
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            const screenPos = proj.position.subtract(this.camera);
            
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 0; // Reset shadow blur at start
            
            if (proj.type === 'laser') {
                // Laser beams - draw as a line from origin
                if (proj.owner && proj.owner.alive) {
                    const ownerPos = proj.owner.position.subtract(this.camera);
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#00ffff';
                    ctx.beginPath();
                    ctx.moveTo(ownerPos.x, ownerPos.y);
                    ctx.lineTo(screenPos.x, screenPos.y);
                    ctx.stroke();
                    
                    // Add glow at projectile position
                    const gradient = this.ctx.createRadialGradient(
                        screenPos.x, screenPos.y, 0,
                        screenPos.x, screenPos.y, 8
                    );
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.5, '#00ffff');
                    gradient.addColorStop(1, '#00ffff00');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Fallback if owner is destroyed
                    const gradient = this.ctx.createRadialGradient(
                        screenPos.x, screenPos.y, 0,
                        screenPos.x, screenPos.y, 5
                    );
                    gradient.addColorStop(0, '#00ffff');
                    gradient.addColorStop(1, '#00ffff00');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (proj.type === 'missile') {
                // Missiles with trail
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffff00';
                
                // Draw missile body
                const gradient = this.ctx.createRadialGradient(
                    screenPos.x, screenPos.y, 0,
                    screenPos.x, screenPos.y, 8
                );
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ffff00');
                gradient.addColorStop(1, '#ffff0000');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw exhaust trail (check velocity is non-zero)
                const velocityLength = proj.velocity.length();
                if (velocityLength > 0) {
                    const trailLength = 20;
                    const trailDir = proj.velocity.normalize().multiply(-1);
                    const trailEnd = screenPos.add(trailDir.multiply(trailLength));
                    
                    const trailGradient = ctx.createLinearGradient(
                        screenPos.x, screenPos.y,
                        trailEnd.x, trailEnd.y
                    );
                    trailGradient.addColorStop(0, '#ff8800aa');
                    trailGradient.addColorStop(1, '#ff880000');
                    
                    ctx.strokeStyle = trailGradient;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(screenPos.x, screenPos.y);
                    ctx.lineTo(trailEnd.x, trailEnd.y);
                    ctx.stroke();
                }
            } else if (proj.type === 'railgun') {
                // Railgun - bright piercing shot
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff00ff';
                
                const gradient = this.ctx.createRadialGradient(
                    screenPos.x, screenPos.y, 0,
                    screenPos.x, screenPos.y, 6
                );
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ff00ff');
                gradient.addColorStop(1, '#ff00ff00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw motion blur trail (check velocity is non-zero)
                const velocityLength = proj.velocity.length();
                if (velocityLength > 0) {
                    const blurLength = 15;
                    const blurDir = proj.velocity.normalize().multiply(-1);
                    const blurEnd = screenPos.add(blurDir.multiply(blurLength));
                    
                    const blurGradient = ctx.createLinearGradient(
                        screenPos.x, screenPos.y,
                        blurEnd.x, blurEnd.y
                    );
                    blurGradient.addColorStop(0, '#ff00ff88');
                    blurGradient.addColorStop(1, '#ff00ff00');
                    
                    ctx.strokeStyle = blurGradient;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(screenPos.x, screenPos.y);
                    ctx.lineTo(blurEnd.x, blurEnd.y);
                    ctx.stroke();
                }
            } else {
                // Cannon - standard projectile
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff8800';
                
                const gradient = this.ctx.createRadialGradient(
                    screenPos.x, screenPos.y, 0,
                    screenPos.x, screenPos.y, 5
                );
                gradient.addColorStop(0, '#ffaa00');
                gradient.addColorStop(0.5, '#ff8800');
                gradient.addColorStop(1, '#ff880000');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
        
        // Draw particles with enhanced visuals
        if (this.displaySettings.particles && this.particles.length > 0) {
            const currentTime = performance.now() / 1000;
            this.particles.forEach(particle => {
                const screenPos = particle.position.subtract(this.camera);
                const age = currentTime - particle.createdAt;
                const alpha = 1 - (age / particle.life);
                
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                
                // Add glow effect to particles
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = particle.color;
                
                // Use particle size if available
                const size = particle.size || 2;
                
                // Draw particle with gradient (if enabled)
                if (this.displaySettings.gradients) {
                    const gradient = this.ctx.createRadialGradient(
                        screenPos.x, screenPos.y, 0,
                        screenPos.x, screenPos.y, size
                    );
                    
                    // Create color with alpha - handle both hex and rgb formats
                    const baseColor = particle.color;
                    const alphaColor1 = baseColor.startsWith('#') ? baseColor + '88' : baseColor.replace(')', ', 0.53)').replace('rgb', 'rgba');
                    const alphaColor2 = baseColor.startsWith('#') ? baseColor + '00' : baseColor.replace(')', ', 0)').replace('rgb', 'rgba');
                    
                    gradient.addColorStop(0, particle.color);
                    gradient.addColorStop(0.5, alphaColor1);
                    gradient.addColorStop(1, alphaColor2);
                    
                    this.ctx.fillStyle = gradient;
                } else {
                    this.ctx.fillStyle = particle.color;
                }
                
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            });
        }
        
        // Draw ships
        this.ships.forEach(ship => ship.draw(this.ctx, this.camera, this.displaySettings));
        
        // Draw ship builder preview
        if (this.shipBuilderActive && this.shipEditor) {
            this.drawShipBuilderPreview();
        }
    }
    
    drawShipBuilderPreview() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        // Draw grid
        this.ctx.strokeStyle = '#003300';
        this.ctx.lineWidth = 1;
        const gridSize = 32;
        const gridCount = 20;
        for (let i = -gridCount; i <= gridCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * gridSize, -gridCount * gridSize);
            this.ctx.lineTo(i * gridSize, gridCount * gridSize);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(-gridCount * gridSize, i * gridSize);
            this.ctx.lineTo(gridCount * gridSize, i * gridSize);
            this.ctx.stroke();
        }
        
        // Draw center crosshair
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-20, 0);
        this.ctx.lineTo(20, 0);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(0, -20);
        this.ctx.lineTo(0, 20);
        this.ctx.stroke();
        
        // Draw current ship design
        for (const section of this.shipEditor.currentShip.sections) {
            const part = section.partData;
            if (part && this.shipEditor.spriteLoader.getSprite(part.file)) {
                const sprite = this.shipEditor.spriteLoader.getSprite(part.file);
                if (sprite && sprite.complete) {
                    const scale = 0.5; // Scale down sprites for editor
                    this.ctx.drawImage(
                        sprite,
                        section.localX - sprite.width * scale / 2,
                        section.localY - sprite.height * scale / 2,
                        sprite.width * scale,
                        sprite.height * scale
                    );
                    
                    // Draw outline
                    this.ctx.strokeStyle = '#00ff00';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        section.localX - sprite.width * scale / 2,
                        section.localY - sprite.height * scale / 2,
                        sprite.width * scale,
                        sprite.height * scale
                    );
                }
            }
        }
        
        // Draw hover preview if part is selected
        if (this.shipEditor.selectedPart) {
            const sprite = this.shipEditor.spriteLoader.getSprite(this.shipEditor.selectedPart.file);
            if (sprite && sprite.complete) {
                const mouseX = this.mouse.x - centerX;
                const mouseY = this.mouse.y - centerY;
                const scale = 0.5;
                
                this.ctx.globalAlpha = 0.5;
                this.ctx.drawImage(
                    sprite,
                    mouseX - sprite.width * scale / 2,
                    mouseY - sprite.height * scale / 2,
                    sprite.width * scale,
                    sprite.height * scale
                );
                this.ctx.globalAlpha = 1.0;
            }
        }
        
        this.ctx.restore();
    }
    
    updateUI() {
        document.getElementById('shipCount').textContent = 
            `Ships: ${this.ships.filter(s => s.alive).length}`;
        
        // Update mode display
        let modeText = this.gameMode === 'skirmish' ? 'Skirmish' : 'Sandbox';
        if (this.gameMode === 'skirmish') {
            modeText += ` | Wave: ${this.wave} | Score: ${this.score}`;
        }
        document.getElementById('mode').textContent = `Mode: ${modeText}`;
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const MAX_DELTA_TIME = 0.1; // Cap at 100ms to prevent physics explosions when tab loses focus
        const dt = Math.min((currentTime - this.lastTime) / 1000, MAX_DELTA_TIME);
        this.lastTime = currentTime;
        
        this.update(dt);
        this.draw();
        
        // Update FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new BattleshipsForeverGame();
});
