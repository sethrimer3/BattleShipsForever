// Battleships Forever - HTML5 Space RTS Edition
// A web-based recreation inspired by the original Battleships Forever

// Game constants
const SCREEN_SHAKE_INTENSITY = 0.05;
const MAX_SCREEN_SHAKE = 10;
const SCREEN_SHAKE_DECAY = 0.9;
const DEFAULT_SCROLL_SPEED = 20; // Match original bfdefault.ini

// Glow color from original bfdefault.ini (orange)
const GLOW_COLOR = 'rgb(160, 80, 0)';

// Audio variation constants
const LASER_VARIATION_CHANCE = 0.5;  // 50% chance to use alternate laser sound
const MISSILE_VARIATION_CHANCE = 0.3; // 30% chance to use mini missile sound
const BUTTON_HOVER_SOUND_CHANCE = 0.3; // 30% chance to play hover sound on regular buttons

// Explosion size thresholds
const LARGE_SECTION_THRESHOLD = 30; // Sections larger than this use big explosion sounds

// Game mode constants
const GRINDER_SPAWN_INTERVAL_MS = 3000; // Time between enemy spawns in grinder mode
const GRINDER_WAVE_PROGRESSION_SECONDS = 30; // Seconds before difficulty increases
const BLOCKADE_SPAWN_DELAY_MS = 800; // Delay between enemy spawns in blockade mode

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

// Persistence System for saving game state and custom ships
class PersistenceManager {
    constructor() {
        this.storagePrefix = 'bfForever_';
        this.settingsKey = this.storagePrefix + 'settings';
        this.shipsKey = this.storagePrefix + 'customShips';
        this.statsKey = this.storagePrefix + 'statistics';
    }
    
    // Settings persistence
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.warn('Failed to save settings:', e);
            return false;
        }
    }
    
    loadSettings() {
        try {
            const data = localStorage.getItem(this.settingsKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('Failed to load settings:', e);
            return null;
        }
    }
    
    // Custom ships persistence
    saveShipDesign(shipData) {
        try {
            const ships = this.loadAllShips();
            // Use timestamp + name as unique ID if no ID exists
            const id = shipData.id || `${Date.now()}_${shipData.name.replace(/[^a-z0-9]/gi, '_')}`;
            shipData.id = id;
            shipData.savedAt = new Date().toISOString();
            
            ships[id] = shipData;
            localStorage.setItem(this.shipsKey, JSON.stringify(ships));
            return id;
        } catch (e) {
            console.warn('Failed to save ship design:', e);
            return null;
        }
    }
    
    loadAllShips() {
        try {
            const data = localStorage.getItem(this.shipsKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.warn('Failed to load ships:', e);
            return {};
        }
    }
    
    loadShipDesign(id) {
        const ships = this.loadAllShips();
        return ships[id] || null;
    }
    
    deleteShipDesign(id) {
        try {
            const ships = this.loadAllShips();
            delete ships[id];
            localStorage.setItem(this.shipsKey, JSON.stringify(ships));
            return true;
        } catch (e) {
            console.warn('Failed to delete ship:', e);
            return false;
        }
    }
    
    // Statistics persistence
    saveStatistics(stats) {
        try {
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
            return true;
        } catch (e) {
            console.warn('Failed to save statistics:', e);
            return false;
        }
    }
    
    loadStatistics() {
        try {
            const data = localStorage.getItem(this.statsKey);
            return data ? JSON.parse(data) : this.getDefaultStatistics();
        } catch (e) {
            console.warn('Failed to load statistics:', e);
            return this.getDefaultStatistics();
        }
    }
    
    getDefaultStatistics() {
        return {
            skirmish: { highScore: 0, bestWave: 0, gamesPlayed: 0, totalKills: 0 },
            grinder: { highScore: 0, longestSurvival: 0, gamesPlayed: 0, totalKills: 0 },
            blockade: { highScore: 0, bestWave: 0, gamesPlayed: 0, totalKills: 0 },
            sandbox: { shipsCreated: 0, timePlayed: 0 },
            totalPlayTime: 0
        };
    }
    
    updateStatistics(mode, stats) {
        const allStats = this.loadStatistics();
        if (!allStats[mode]) allStats[mode] = {};
        
        Object.assign(allStats[mode], stats);
        this.saveStatistics(allStats);
        return allStats;
    }
    
    clearAllData() {
        try {
            localStorage.removeItem(this.settingsKey);
            localStorage.removeItem(this.shipsKey);
            localStorage.removeItem(this.statsKey);
            return true;
        } catch (e) {
            console.warn('Failed to clear data:', e);
            return false;
        }
    }
}

// Ship Presets - Predefined ship designs for quick deployment
class ShipPresets {
    static getPresets() {
        return {
            'fighter': {
                name: "Fighter",
                description: "Fast and agile with light weapons",
                team: "player",
                sections: [
                    { id: "core_small_01", localX: 0, localY: 0, rotation: 0 },
                    { id: "cannon_01", localX: -20, localY: -10, rotation: 0 },
                    { id: "cannon_01", localX: -20, localY: 10, rotation: 0 },
                    { id: "engine_01", localX: 20, localY: 0, rotation: Math.PI }
                ]
            },
            'destroyer': {
                name: "Destroyer",
                description: "Balanced firepower and defense",
                team: "player",
                sections: [
                    { id: "core_medium_01", localX: 0, localY: 0, rotation: 0 },
                    { id: "cannon_02", localX: -30, localY: -15, rotation: 0 },
                    { id: "cannon_02", localX: -30, localY: 15, rotation: 0 },
                    { id: "missile_01", localX: -25, localY: 0, rotation: 0 },
                    { id: "armor_01", localX: 20, localY: -15, rotation: 0 },
                    { id: "armor_01", localX: 20, localY: 15, rotation: 0 },
                    { id: "engine_01", localX: 30, localY: 0, rotation: Math.PI }
                ]
            },
            'cruiser': {
                name: "Cruiser",
                description: "Heavy weapons platform",
                team: "player",
                sections: [
                    { id: "core_large_01", localX: 0, localY: 0, rotation: 0 },
                    { id: "cannon_02", localX: -40, localY: -25, rotation: 0 },
                    { id: "cannon_02", localX: -40, localY: 25, rotation: 0 },
                    { id: "cannon_02", localX: -35, localY: 0, rotation: 0 },
                    { id: "missile_01", localX: -30, localY: -15, rotation: 0 },
                    { id: "missile_01", localX: -30, localY: 15, rotation: 0 },
                    { id: "shield_01", localX: 25, localY: 0, rotation: 0 },
                    { id: "armor_01", localX: 30, localY: -20, rotation: 0 },
                    { id: "armor_01", localX: 30, localY: 20, rotation: 0 },
                    { id: "engine_01", localX: 40, localY: -10, rotation: Math.PI },
                    { id: "engine_01", localX: 40, localY: 10, rotation: Math.PI }
                ]
            },
            'gunship': {
                name: "Gunship",
                description: "Rapid-fire weapons specialist",
                team: "player",
                sections: [
                    { id: "core_medium_01", localX: 0, localY: 0, rotation: 0 },
                    { id: "cannon_01", localX: -25, localY: -20, rotation: 0 },
                    { id: "cannon_01", localX: -25, localY: -10, rotation: 0 },
                    { id: "cannon_01", localX: -25, localY: 10, rotation: 0 },
                    { id: "cannon_01", localX: -25, localY: 20, rotation: 0 },
                    { id: "armor_01", localX: 20, localY: 0, rotation: 0 },
                    { id: "engine_01", localX: 30, localY: 0, rotation: Math.PI }
                ]
            },
            'interceptor': {
                name: "Interceptor",
                description: "Ultra-fast scout with minimal weapons",
                team: "player",
                sections: [
                    { id: "core_small_01", localX: 0, localY: 0, rotation: 0 },
                    { id: "cannon_01", localX: -15, localY: 0, rotation: 0 },
                    { id: "engine_01", localX: 15, localY: -8, rotation: Math.PI },
                    { id: "engine_01", localX: 15, localY: 8, rotation: Math.PI }
                ]
            }
        };
    }
    
    static getPreset(name) {
        return this.getPresets()[name] || null;
    }
    
    static getPresetNames() {
        return Object.keys(this.getPresets());
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
                    
                    // Play weapon sound effect with variety
                    if (audio) {
                        // Use sound variations for more authentic experience
                        if (section.type === 'laser' && Math.random() < LASER_VARIATION_CHANCE) {
                            audio.playSound('laser2');
                        } else if (section.type === 'missile' && Math.random() < MISSILE_VARIATION_CHANCE) {
                            audio.playSound('miniMissile');
                        } else {
                            audio.playSound(section.type);
                        }
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
                // Use varied explosion sounds based on section size
                const explosionSounds = section.size > LARGE_SECTION_THRESHOLD 
                    ? ['explosion', 'explosion1', 'explosion4', 'explosion5', 'expBig1', 'expBig2', 'expBig3']
                    : ['explosion2', 'explosion3', 'expSmall1', 'expSmall2', 'expSmall3', 'expSmall4', 'expSmall5'];
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
        this.gameMode = 'sandbox'; // sandbox, skirmish, grinder, blockade
        
        // Skirmish/Grinder/Blockade mode state
        this.wave = 0;
        this.enemiesRemaining = 0;
        this.score = 0;
        this.waveActive = false;
        this.survivalTime = 0; // For grinder mode
        this.enemiesDefeated = 0; // For tracking kills
        
        // Screen effects
        this.screenShake = 0;
        
        // Display settings (matching original bfdefault.ini)
        this.displaySettings = {
            particles: true,
            gradients: true,
            shimmer: true,
            doodads: true,
            interpolation: true,
            scrollSpeed: DEFAULT_SCROLL_SPEED,
            fullscreen: false
        };
        
        // Initialize space doodads (asteroids, debris)
        this.doodads = [];
        this.initializeDoodads();
        
        // Initialize persistence manager
        this.persistence = new PersistenceManager();
        this.statistics = this.persistence.loadStatistics();
        
        // Initialize audio manager
        this.audio = new AudioManager();
        this.loadAudio();
        
        // Load saved settings
        this.loadSavedSettings();
        
        this.setupEventListeners();
        this.initializeShipEditor();
        this.setupShipBuilder();
        this.setupMenuSounds();
        
        // Show loading screen, then main menu after brief delay
        this.hideLoadingScreen();
        
        this.gameLoop();
    }
    
    hideLoadingScreen() {
        // Simulate loading time and hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.style.transition = 'opacity 0.5s ease-out';
            loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                this.showMainMenu();
            }, 500);
        }, 1000);
    }
    
    showMainMenu() {
        this.inGame = false;
        this.paused = false;
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('ui').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('pauseMenu').classList.remove('active');
        // Use Briefingmusic for main menu - more menu-appropriate than Theme
        this.audio.playMusic('Briefingmusic.ogg');
        
        // Show welcome screen on first visit
        this.checkFirstVisit();
    }
    
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('bfForever_hasVisited');
        if (!hasVisited) {
            // Small delay to let main menu render first
            setTimeout(() => {
                document.getElementById('welcomeScreen').style.display = 'flex';
            }, 500);
        }
    }
    
    closeWelcome() {
        this.audio.playSound('buttonClick');
        localStorage.setItem('bfForever_hasVisited', 'true');
        document.getElementById('welcomeScreen').style.display = 'none';
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
                const sides = 6 + Math.floor(Math.random() * 2); // 6 or 7 sides for variety
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
        
        // Clean up any existing grinder spawn interval
        if (this.grinderSpawnInterval) {
            clearInterval(this.grinderSpawnInterval);
            this.grinderSpawnInterval = null;
        }
        
        this.inGame = true;
        this.paused = false;
        this.gameMode = mode;
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('gameModeMenu').classList.remove('active');
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('ui').style.display = 'flex';
        document.getElementById('instructions').style.display = 'block';
        this.audio.playMusic('Combatmusic.ogg');
        
        // Initialize game mode
        if (mode === 'skirmish') {
            this.startSkirmish();
        } else if (mode === 'grinder') {
            this.startGrinder();
        } else if (mode === 'blockade') {
            this.startBlockade();
        }
    }
    
    startSkirmish() {
        // Reset skirmish state
        this.wave = 0;
        this.score = 0;
        this.enemiesRemaining = 0;
        this.enemiesDefeated = 0;
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
    
    startGrinder() {
        // Grinder mode: Endless survival with continuous enemy spawning
        this.wave = 1;
        this.score = 0;
        this.enemiesRemaining = 0;
        this.enemiesDefeated = 0;
        this.survivalTime = 0;
        this.waveActive = true;
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        
        // Show grinder mode announcement
        const announcement = document.getElementById('waveAnnouncement');
        const waveNumberSpan = document.getElementById('waveNumber');
        const titleHeading = announcement.querySelector('h1');
        const prepareText = announcement.querySelector('p');
        
        // Store original content as strings
        const originalTitle = titleHeading.textContent;
        const originalSubtitle = prepareText.textContent;
        
        // Temporarily update content
        waveNumberSpan.style.display = 'none';
        titleHeading.textContent = 'GRINDER MODE';
        prepareText.textContent = 'SURVIVE AS LONG AS YOU CAN';
        announcement.style.display = 'block';
        announcement.style.animation = 'fadeInOut 3s ease-in-out';
        
        setTimeout(() => {
            announcement.style.display = 'none';
            announcement.style.animation = '';
            // Restore original content
            titleHeading.textContent = originalTitle;
            waveNumberSpan.style.display = '';
            prepareText.textContent = originalSubtitle;
        }, 3000);
        
        // Spawn player ship
        const playerShip = new Ship(
            this.canvas.width / 2 + this.camera.x,
            this.canvas.height / 2 + this.camera.y,
            'player'
        );
        playerShip.addSection(new ShipSection('cannon', 'medium', 30, 0));
        playerShip.addSection(new ShipSection('cannon', 'medium', -30, 0));
        playerShip.addSection(new ShipSection('laser', 'medium', 0, 30));
        playerShip.addSection(new ShipSection('missile', 'medium', 0, -30));
        this.ships.push(playerShip);
        
        // Start continuous spawning
        this.grinderSpawnInterval = setInterval(() => {
            if (this.inGame && !this.paused && this.gameMode === 'grinder') {
                // Check if player is still alive before spawning
                const playerAlive = this.ships.some(s => s.alive && s.team === 'player');
                if (!playerAlive) {
                    clearInterval(this.grinderSpawnInterval);
                    this.grinderSpawnInterval = null;
                    return;
                }
                
                const factions = ['enemy', 'pirate', 'alien', 'razor'];
                const faction = factions[Math.floor(Math.random() * factions.length)];
                this.spawnEnemyShip(faction);
                this.enemiesRemaining++; // Track spawned enemies for kill counting
            }
        }, GRINDER_SPAWN_INTERVAL_MS);
        
        this.updateUI();
    }
    
    startBlockade() {
        // Blockade mode: Defend position, enemies come from the right
        this.wave = 0;
        this.score = 0;
        this.enemiesRemaining = 0;
        this.enemiesDefeated = 0;
        this.waveActive = false;
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        
        // Spawn player ship on the left side
        const playerShip = new Ship(
            this.canvas.width * 0.25 + this.camera.x,
            this.canvas.height / 2 + this.camera.y,
            'player'
        );
        playerShip.addSection(new ShipSection('cannon', 'medium', 30, 0));
        playerShip.addSection(new ShipSection('cannon', 'medium', -30, 0));
        playerShip.addSection(new ShipSection('railgun', 'medium', 0, 30));
        playerShip.addSection(new ShipSection('laser', 'medium', 0, -30));
        this.ships.push(playerShip);
        
        // Start first wave
        this.nextWaveBlockade();
        this.updateUI();
    }
    
    nextWave() {
        this.wave++;
        this.waveActive = true;
        
        // Show wave announcement
        this.showWaveAnnouncement(this.wave);
        
        // Switch to more intense music for higher waves
        if (this.wave === 5 && this.audio.currentMusicTrack !== 'Battlemusic.ogg') {
            this.audio.playMusic('Battlemusic.ogg');
        }
        
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
    
    nextWaveBlockade() {
        this.wave++;
        this.waveActive = true;
        
        // Show wave announcement
        this.showWaveAnnouncement(this.wave);
        
        // Switch to more intense music for higher waves
        if (this.wave === 5 && this.audio.currentMusicTrack !== 'Battlemusic.ogg') {
            this.audio.playMusic('Battlemusic.ogg');
        }
        
        // Spawn enemies from the right side
        const enemyCount = Math.min(3 + this.wave, 12);
        const factions = ['enemy', 'pirate', 'alien', 'razor'];
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const faction = factions[Math.floor(Math.random() * factions.length)];
                // Spawn on the right side of the screen
                const enemy = new Ship(
                    this.canvas.width + 200 + this.camera.x,
                    Math.random() * this.canvas.height + this.camera.y,
                    faction
                );
                
                // Add weapon sections based on faction
                if (faction === 'alien') {
                    enemy.addSection(new ShipSection('laser', 'medium', 20, 0));
                    enemy.addSection(new ShipSection('laser', 'medium', -20, 0));
                } else if (faction === 'razor') {
                    enemy.addSection(new ShipSection('railgun', 'medium', 0, 20));
                    enemy.addSection(new ShipSection('cannon', 'medium', 0, -20));
                } else {
                    enemy.addSection(new ShipSection('cannon', 'medium', 15, 15));
                    enemy.addSection(new ShipSection('missile', 'medium', -15, -15));
                }
                
                this.ships.push(enemy);
                this.enemiesRemaining++;
            }, i * BLOCKADE_SPAWN_DELAY_MS);
        }
        
        this.audio.playSound('deploy');
    }
    
    checkSkirmishWave() {
        if ((this.gameMode !== 'skirmish' && this.gameMode !== 'blockade') || !this.waveActive) return;
        
        // Count remaining enemies
        const enemyCount = this.ships.filter(s => s.alive && s.team !== 'player').length;
        
        // Check if all enemies are defeated
        if (enemyCount === 0 && this.enemiesRemaining > 0) {
            // Wave complete
            this.waveActive = false;
            this.enemiesRemaining = 0; // Reset for next wave
            const bonus = this.wave * 100;
            this.score += bonus;
            
            // Play wave complete sound
            this.audio.playSound('issueOrder');
            
            // Show wave complete message
            document.getElementById('waveBonus').textContent = bonus;
            const waveCompleteEl = document.getElementById('waveComplete');
            waveCompleteEl.style.display = 'block';
            
            // Wait 3 seconds before next wave
            setTimeout(() => {
                waveCompleteEl.style.display = 'none';
                if (this.gameMode === 'skirmish' && this.inGame) {
                    this.nextWave();
                } else if (this.gameMode === 'blockade' && this.inGame) {
                    this.nextWaveBlockade();
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
        
        // Update statistics before showing game over screen
        this.updateGameStatistics();
        
        // Show game over screen with mode-specific stats
        if (this.gameMode === 'grinder') {
            document.getElementById('finalWave').textContent = this.formatTime(this.survivalTime);
            document.getElementById('waveLabel').textContent = 'Survival Time:';
            document.getElementById('finalScore').textContent = `${this.score} (${this.enemiesDefeated} kills)`;
        } else {
            document.getElementById('waveLabel').textContent = 'Wave Reached:';
            document.getElementById('finalWave').textContent = this.wave;
            document.getElementById('finalScore').textContent = this.score;
        }
        
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('ui').style.display = 'none';
        document.getElementById('instructions').style.display = 'none';
        
        this.audio.stopMusic();
    }
    
    updateGameStatistics() {
        const mode = this.gameMode;
        if (mode === 'sandbox') return; // Don't track sandbox stats
        
        const stats = this.statistics[mode] || {};
        
        if (mode === 'skirmish' || mode === 'blockade') {
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            stats.totalKills = (stats.totalKills || 0) + this.enemiesDefeated;
            
            if (this.score > (stats.highScore || 0)) {
                stats.highScore = this.score;
                stats.highScoreDate = new Date().toISOString();
            }
            
            if (this.wave > (stats.bestWave || 0)) {
                stats.bestWave = this.wave;
            }
        } else if (mode === 'grinder') {
            stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
            stats.totalKills = (stats.totalKills || 0) + this.enemiesDefeated;
            
            if (this.score > (stats.highScore || 0)) {
                stats.highScore = this.score;
                stats.highScoreDate = new Date().toISOString();
            }
            
            if (this.survivalTime > (stats.longestSurvival || 0)) {
                stats.longestSurvival = this.survivalTime;
            }
        }
        
        this.persistence.updateStatistics(mode, stats);
        this.statistics = this.persistence.loadStatistics();
    }
    
    showOptions() {
        this.audio.playSound('buttonClick');
        document.getElementById('optionsMenu').classList.add('active');
    }
    
    closeOptions() {
        this.audio.playSound('buttonClick');
        document.getElementById('optionsMenu').classList.remove('active');
    }
    
    showGameModeMenu() {
        this.audio.playSound('buttonClick');
        document.getElementById('gameModeMenu').classList.add('active');
        document.getElementById('mainMenu').classList.add('hidden');
    }
    
    hideGameModeMenu() {
        this.audio.playSound('buttonClick');
        document.getElementById('gameModeMenu').classList.remove('active');
        document.getElementById('mainMenu').classList.remove('hidden');
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
        this.audio.playSound('buttonExit');
        document.getElementById('pauseMenu').classList.remove('active');
        
        // Clean up grinder spawn interval if active
        if (this.grinderSpawnInterval) {
            clearInterval(this.grinderSpawnInterval);
            this.grinderSpawnInterval = null;
        }
        
        this.reset();
        this.showMainMenu();
    }
    
    showShipLibrary() {
        this.audio.playSound('buttonClick');
        const menu = document.getElementById('shipLibraryMenu');
        menu.style.display = 'flex';
        this.updateShipLibraryDisplay();
    }
    
    hideShipLibrary() {
        this.audio.playSound('buttonClick');
        document.getElementById('shipLibraryMenu').style.display = 'none';
    }
    
    updateShipLibraryDisplay() {
        const listContainer = document.getElementById('shipLibraryList');
        const ships = this.persistence.loadAllShips();
        const shipList = Object.entries(ships);
        
        if (shipList.length === 0) {
            listContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No saved ships yet. Create and save your first design!</p>';
            return;
        }
        
        listContainer.innerHTML = '';
        
        shipList.sort((a, b) => {
            const dateA = new Date(a[1].savedAt || a[1].timestamp);
            const dateB = new Date(b[1].savedAt || b[1].timestamp);
            return dateB - dateA; // Most recent first
        });
        
        shipList.forEach(([id, ship]) => {
            const shipCard = document.createElement('div');
            shipCard.style.cssText = 'background: rgba(0, 50, 0, 0.5); border: 1px solid #00ff00; padding: 15px; margin-bottom: 10px; border-radius: 5px;';
            
            const savedDate = new Date(ship.savedAt || ship.timestamp);
            const dateStr = savedDate.toLocaleDateString() + ' ' + savedDate.toLocaleTimeString();
            
            shipCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <h4 style="color: #00ff00; margin: 0 0 5px 0;">${ship.name}</h4>
                        <p style="color: #888; font-size: 12px; margin: 0;">${ship.description || 'No description'}</p>
                        <p style="color: #666; font-size: 11px; margin: 5px 0 0 0;">Saved: ${dateStr}</p>
                        <p style="color: #666; font-size: 11px; margin: 0;">Sections: ${ship.sections?.length || 0}</p>
                    </div>
                    <div style="display: flex; gap: 5px; flex-direction: column;">
                        <button class="btn" style="padding: 5px 10px; font-size: 12px;" onclick="game.spawnShipFromLibrary('${id}')">Deploy</button>
                        <button class="btn" style="padding: 5px 10px; font-size: 12px;" onclick="game.deleteShipFromLibrary('${id}')">Delete</button>
                    </div>
                </div>
            `;
            
            listContainer.appendChild(shipCard);
        });
    }
    
    spawnShipFromLibrary(shipId) {
        const shipData = this.persistence.loadShipDesign(shipId);
        if (!shipData) {
            alert('Ship not found');
            return;
        }
        
        if (this.shipEditor) {
            this.shipEditor.loadShipFromJSON(shipData);
            this.hideShipLibrary();
            alert(`Ship "${shipData.name}" loaded into editor. Use Ship Builder to deploy it.`);
        }
    }
    
    deleteShipFromLibrary(shipId) {
        if (confirm('Are you sure you want to delete this ship?')) {
            if (this.persistence.deleteShipDesign(shipId)) {
                this.audio.playSound('buttonClick');
                this.updateShipLibraryDisplay();
            } else {
                alert('Failed to delete ship');
            }
        }
    }
    
    showStatistics() {
        this.audio.playSound('buttonClick');
        const menu = document.getElementById('statisticsMenu');
        menu.style.display = 'flex';
        this.updateStatisticsDisplay();
    }
    
    hideStatistics() {
        this.audio.playSound('buttonClick');
        document.getElementById('statisticsMenu').style.display = 'none';
    }
    
    toggleHelp() {
        this.audio.playSound('buttonClick');
        const helpOverlay = document.getElementById('helpOverlay');
        if (helpOverlay.style.display === 'flex') {
            helpOverlay.style.display = 'none';
        } else {
            helpOverlay.style.display = 'flex';
        }
    }
    
    updateStatisticsDisplay() {
        const container = document.getElementById('statisticsContent');
        const stats = this.statistics;
        
        let html = '<div style="color: #00ff00;">';
        
        // Skirmish stats
        html += '<div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 50, 0, 0.3); border: 1px solid #004400;">';
        html += '<h4 style="color: #0ff; margin: 0 0 10px 0; font-size: 18px;">🎯 SKIRMISH MODE</h4>';
        html += `<p style="margin: 5px 0;">High Score: <span style="color: #fff;">${stats.skirmish?.highScore || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Best Wave: <span style="color: #fff;">${stats.skirmish?.bestWave || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Games Played: <span style="color: #fff;">${stats.skirmish?.gamesPlayed || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Total Kills: <span style="color: #fff;">${stats.skirmish?.totalKills || 0}</span></p>`;
        html += '</div>';
        
        // Grinder stats
        html += '<div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 50, 0, 0.3); border: 1px solid #004400;">';
        html += '<h4 style="color: #0ff; margin: 0 0 10px 0; font-size: 18px;">⚔️ GRINDER MODE</h4>';
        html += `<p style="margin: 5px 0;">High Score: <span style="color: #fff;">${stats.grinder?.highScore || 0}</span></p>`;
        const survivalTime = stats.grinder?.longestSurvival || 0;
        html += `<p style="margin: 5px 0;">Longest Survival: <span style="color: #fff;">${this.formatTime(survivalTime)}</span></p>`;
        html += `<p style="margin: 5px 0;">Games Played: <span style="color: #fff;">${stats.grinder?.gamesPlayed || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Total Kills: <span style="color: #fff;">${stats.grinder?.totalKills || 0}</span></p>`;
        html += '</div>';
        
        // Blockade stats
        html += '<div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 50, 0, 0.3); border: 1px solid #004400;">';
        html += '<h4 style="color: #0ff; margin: 0 0 10px 0; font-size: 18px;">🛡️ BLOCKADE MODE</h4>';
        html += `<p style="margin: 5px 0;">High Score: <span style="color: #fff;">${stats.blockade?.highScore || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Best Wave: <span style="color: #fff;">${stats.blockade?.bestWave || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Games Played: <span style="color: #fff;">${stats.blockade?.gamesPlayed || 0}</span></p>`;
        html += `<p style="margin: 5px 0;">Total Kills: <span style="color: #fff;">${stats.blockade?.totalKills || 0}</span></p>`;
        html += '</div>';
        
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    setSFXVolume(value) {
        this.audio.setSoundVolume(value / 100);
        document.getElementById('sfxValue').textContent = value + '%';
        this.saveSettings();
    }
    
    setMusicVolume(value) {
        this.audio.setMusicVolume(value / 100);
        document.getElementById('musicValue').textContent = value + '%';
        this.saveSettings();
    }
    
    setDifficulty(diff) {
        this.difficulty = diff;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    setScrollSpeed(value) {
        this.displaySettings.scrollSpeed = parseInt(value);
        document.getElementById('scrollSpeedValue').textContent = value;
        this.saveSettings();
    }
    
    loadSavedSettings() {
        const saved = this.persistence.loadSettings();
        if (!saved) return;
        
        // Apply saved audio settings
        if (saved.sfxVolume !== undefined) {
            this.audio.setSoundVolume(saved.sfxVolume);
            document.getElementById('sfxVolume').value = saved.sfxVolume * 100;
            document.getElementById('sfxValue').textContent = Math.round(saved.sfxVolume * 100) + '%';
        }
        
        if (saved.musicVolume !== undefined) {
            this.audio.setMusicVolume(saved.musicVolume);
            document.getElementById('musicVolume').value = saved.musicVolume * 100;
            document.getElementById('musicValue').textContent = Math.round(saved.musicVolume * 100) + '%';
        }
        
        // Apply saved difficulty
        if (saved.difficulty) {
            this.difficulty = saved.difficulty;
            document.getElementById('difficulty').value = saved.difficulty;
        }
        
        // Apply saved display settings
        if (saved.displaySettings) {
            Object.assign(this.displaySettings, saved.displaySettings);
            
            // Update UI checkboxes
            if (document.getElementById('particlesToggle')) {
                document.getElementById('particlesToggle').checked = this.displaySettings.particles;
            }
            if (document.getElementById('gradientsToggle')) {
                document.getElementById('gradientsToggle').checked = this.displaySettings.gradients;
            }
            if (document.getElementById('shimmerToggle')) {
                document.getElementById('shimmerToggle').checked = this.displaySettings.shimmer;
            }
            if (document.getElementById('doodadsToggle')) {
                document.getElementById('doodadsToggle').checked = this.displaySettings.doodads;
            }
            if (document.getElementById('interpolationToggle')) {
                document.getElementById('interpolationToggle').checked = this.displaySettings.interpolation;
            }
            if (document.getElementById('scrollSpeed')) {
                document.getElementById('scrollSpeed').value = this.displaySettings.scrollSpeed;
                document.getElementById('scrollSpeedValue').textContent = this.displaySettings.scrollSpeed;
            }
        }
    }
    
    saveSettings() {
        const settings = {
            sfxVolume: this.audio.soundVolume,
            musicVolume: this.audio.musicVolume,
            difficulty: this.difficulty,
            displaySettings: { ...this.displaySettings }
        };
        this.persistence.saveSettings(settings);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    showWaveAnnouncement(waveNum) {
        const announcement = document.getElementById('waveAnnouncement');
        document.getElementById('waveNumber').textContent = waveNum;
        announcement.style.display = 'block';
        announcement.style.animation = 'fadeInOut 2s ease-in-out';
        
        setTimeout(() => {
            announcement.style.display = 'none';
            announcement.style.animation = '';
        }, 2000);
    }
    
    toggleParticles(enabled) {
        this.displaySettings.particles = enabled;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    toggleGradients(enabled) {
        this.displaySettings.gradients = enabled;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    toggleShimmer(enabled) {
        this.displaySettings.shimmer = enabled;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    toggleDoodads(enabled) {
        this.displaySettings.doodads = enabled;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    toggleInterpolation(enabled) {
        this.displaySettings.interpolation = enabled;
        this.audio.playSound('buttonClick');
        this.saveSettings();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                this.displaySettings.fullscreen = true;
                this.audio.playSound('buttonClick');
            }).catch(err => {
                console.warn('Could not enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.displaySettings.fullscreen = false;
                this.audio.playSound('buttonClick');
            });
        }
    }
    
    loadAudio() {
        // Load weapon firing sound effects - multiple variations for variety
        this.audio.loadSound('cannon', 'ORIGINAL/Sounds/snd_Blaster.wav');
        this.audio.loadSound('laser', 'ORIGINAL/Sounds/snd_BeamFire1.wav');
        this.audio.loadSound('laser2', 'ORIGINAL/Sounds/snd_BeamFire2.wav');
        this.audio.loadSound('beamLoop', 'ORIGINAL/Sounds/snd_BeamLoop.wav');
        this.audio.loadSound('missile', 'ORIGINAL/Sounds/snd_MissileLaunch.wav');
        this.audio.loadSound('miniMissile', 'ORIGINAL/Sounds/snd_MiniMissileFire.wav');
        this.audio.loadSound('railgun', 'ORIGINAL/Sounds/snd_Dieterling.wav');
        this.audio.loadSound('dualScatter', 'ORIGINAL/Sounds/snd_DualScatter.wav');
        this.audio.loadSound('driver', 'ORIGINAL/Sounds/snd_Driver.wav');
        this.audio.loadSound('lancet', 'ORIGINAL/Sounds/snd_Lancet.wav');
        
        // Additional weapon sounds from original
        this.audio.loadSound('vulcan', 'ORIGINAL/Sounds/snd_VulcanCannonFire.wav');
        this.audio.loadSound('pulse', 'ORIGINAL/Sounds/snd_Pulse.wav');
        this.audio.loadSound('plasma', 'ORIGINAL/Sounds/snd_PlasmaFire.wav');
        this.audio.loadSound('tachyon', 'ORIGINAL/Sounds/snd_Tachyon.wav');
        
        // Load explosion sound effects - more variety
        this.audio.loadSound('explosion', 'ORIGINAL/Sounds/snd_ExpShockwave.wav');
        this.audio.loadSound('explosion1', 'ORIGINAL/Sounds/snd_FlashBoltExplode.wav');
        this.audio.loadSound('explosion2', 'ORIGINAL/Sounds/snd_FlashBoltExplode2.wav');
        this.audio.loadSound('explosion3', 'ORIGINAL/Sounds/snd_RAShellExplode.wav');
        this.audio.loadSound('explosion4', 'ORIGINAL/Sounds/snd_FlashBoltExplode3.wav');
        this.audio.loadSound('explosion5', 'ORIGINAL/Sounds/snd_FlashBoltExplode4.wav');
        
        // Additional explosion sounds
        this.audio.loadSound('expBig1', 'ORIGINAL/Sounds/snd_expbig1.wav');
        this.audio.loadSound('expBig2', 'ORIGINAL/Sounds/snd_expbig2.wav');
        this.audio.loadSound('expBig3', 'ORIGINAL/Sounds/snd_expbig3.wav');
        this.audio.loadSound('expSmall1', 'ORIGINAL/Sounds/snd_expsml1.wav');
        this.audio.loadSound('expSmall2', 'ORIGINAL/Sounds/snd_expsml2.wav');
        this.audio.loadSound('expSmall3', 'ORIGINAL/Sounds/snd_expsml3.wav');
        this.audio.loadSound('expSmall4', 'ORIGINAL/Sounds/snd_expsml4.wav');
        this.audio.loadSound('expSmall5', 'ORIGINAL/Sounds/snd_expsml5.wav');
        
        // Load shield/impact sounds
        this.audio.loadSound('shieldHit', 'ORIGINAL/Sounds/snd_DeflectorActivate.wav');
        
        // Load UI sound effects
        this.audio.loadSound('buttonClick', 'ORIGINAL/Sounds/snd_ClickButton.wav');
        this.audio.loadSound('buttonExit', 'ORIGINAL/Sounds/snd_ClickButtonExit.wav');
        this.audio.loadSound('selectShip', 'ORIGINAL/Sounds/snd_ChooseShip.wav');
        this.audio.loadSound('deploy', 'ORIGINAL/Sounds/snd_DeployPlatform.wav');
        this.audio.loadSound('issueOrder', 'ORIGINAL/Sounds/snd_IssueOrder.wav');
        this.audio.loadSound('negativeOrder', 'ORIGINAL/Sounds/snd_NegativeOrder.wav');
        this.audio.loadSound('menuButton', 'ORIGINAL/Sounds/snd_menubut.wav');
        this.audio.loadSound('toggleMode', 'ORIGINAL/Sounds/snd_ToggleMode.wav');
        
        // Load engine/booster sounds
        this.audio.loadSound('boosterActivate', 'ORIGINAL/Sounds/snd_BoosterActivate.wav');
        
        // Music will be started by menu system
    }
    
    async initializeShipEditor() {
        this.shipEditor = new ShipEditor(this);
        await this.shipEditor.initialize();
    }
    
    setupMenuSounds() {
        // Add hover sounds to all menu buttons
        const menuButtons = document.querySelectorAll('.menu-btn');
        menuButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                this.audio.playSound('menuButton');
            });
        });
        
        // Add sounds to regular buttons that don't already have sound handling
        const regularButtons = document.querySelectorAll('.btn');
        regularButtons.forEach(button => {
            // Skip buttons that already have sound handling (marked with data attribute)
            if (!button.hasAttribute('data-has-sound')) {
                button.addEventListener('mouseenter', () => {
                    // Subtle hover sound for regular buttons
                    if (Math.random() < BUTTON_HOVER_SOUND_CHANCE) {
                        this.audio.playSound('menuButton');
                    }
                });
            }
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Escape key to pause/unpause or return from game over
            if (e.key === 'Escape') {
                e.preventDefault();
                // Check if on game over screen
                const gameOverScreen = document.getElementById('gameOverScreen');
                if (gameOverScreen && gameOverScreen.style.display === 'block') {
                    this.returnToMainMenu();
                } else if (this.inGame) {
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
            if (this.selectedShips.length > 0) {
                this.selectedShips.forEach(ship => {
                    ship.targetPosition = worldPos;
                });
                // Play order sound when commanding ships
                this.audio.playSound('issueOrder');
            }
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
                // Base smoothing factor of 0.05 provides smooth camera following
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
        
        // Handle game mode specific updates
        if (this.gameMode === 'skirmish' || this.gameMode === 'blockade') {
            this.checkSkirmishWave();
        } else if (this.gameMode === 'grinder' && this.inGame) {
            // Track survival time in grinder mode
            this.survivalTime += dt;
            
            // Update wave/difficulty based on survival time
            this.wave = Math.floor(this.survivalTime / GRINDER_WAVE_PROGRESSION_SECONDS) + 1;
            
            // Track enemy kills for scoring
            const currentEnemyCount = this.ships.filter(s => s.alive && s.team !== 'player').length;
            if (currentEnemyCount < this.enemiesRemaining) {
                const killed = this.enemiesRemaining - currentEnemyCount;
                this.enemiesDefeated += killed;
                this.score += killed * 50; // 50 points per kill
                this.enemiesRemaining = currentEnemyCount;
            }
            
            // Check if player is dead
            const playerAlive = this.ships.some(s => s.alive && s.team === 'player');
            if (!playerAlive) {
                if (this.grinderSpawnInterval) {
                    clearInterval(this.grinderSpawnInterval);
                    this.grinderSpawnInterval = null;
                }
                this.gameOver();
            }
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
        
        // Update mode display based on game mode
        let modeText = '';
        if (this.gameMode === 'sandbox') {
            modeText = 'Sandbox';
        } else if (this.gameMode === 'skirmish') {
            modeText = `Skirmish | Wave: ${this.wave} | Score: ${this.score}`;
        } else if (this.gameMode === 'grinder') {
            modeText = `Grinder | Time: ${this.formatTime(this.survivalTime)} | Kills: ${this.enemiesDefeated} | Score: ${this.score}`;
        } else if (this.gameMode === 'blockade') {
            modeText = `Blockade | Wave: ${this.wave} | Score: ${this.score}`;
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
