// Battleships Forever - HTML5 Space RTS Edition
// A web-based recreation inspired by the original Battleships Forever

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
        
        // Add a default core section
        this.addSection(new ShipSection('core', 'medium', 0, 0));
        
        // Ship properties (calculated from sections)
        this.updateProperties();
    }
    
    addSection(section) {
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
    
    update(dt, ships, projectiles) {
        if (!this.alive) return;
        
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
            
            // Rotate to face enemy
            const targetAngle = Math.atan2(toEnemy.y, toEnemy.x);
            let angleDiff = targetAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            this.angle += angleDiff * 0.08;
            
            // Fire weapons if in range and facing target
            if (distance < 400 && Math.abs(angleDiff) < 0.3) {
                this.fireWeapons(projectiles, Date.now());
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
    
    fireWeapons(projectiles, currentTime) {
        for (const section of this.sections) {
            if (['cannon', 'laser', 'missile', 'railgun'].includes(section.type)) {
                if (currentTime - section.lastFired > section.fireRate) {
                    section.lastFired = currentTime;
                    
                    // Calculate weapon position in world space
                    const rotated = new Vector2(section.localX, section.localY).rotate(this.angle);
                    const worldPos = this.position.add(rotated);
                    
                    // Create projectile
                    const projectile = {
                        position: worldPos,
                        velocity: new Vector2(Math.cos(this.angle), Math.sin(this.angle))
                            .multiply(section.type === 'missile' ? 150 : section.type === 'railgun' ? 500 : 300),
                        damage: section.damage,
                        type: section.type,
                        team: this.team,
                        life: section.type === 'laser' ? 0.5 : 2,
                        createdAt: currentTime / 1000
                    };
                    
                    projectiles.push(projectile);
                }
            }
        }
    }
    
    takeDamage(damage) {
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
            
            // If core is destroyed or no sections left, ship is destroyed
            if (this.sections.length === 0 || !this.sections.some(s => s.type === 'core')) {
                this.alive = false;
            }
        }
        
        this.updateProperties();
    }
    
    draw(ctx, camera) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(
            this.position.x - camera.x,
            this.position.y - camera.y
        );
        ctx.rotate(this.angle);
        
        // Draw sections
        for (const section of this.sections) {
            // Section glow
            const gradient = ctx.createRadialGradient(
                section.localX, section.localY, 0,
                section.localX, section.localY, section.radius
            );
            gradient.addColorStop(0, section.color);
            gradient.addColorStop(0.7, section.color + '88');
            gradient.addColorStop(1, section.color + '00');
            
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
            ctx.strokeStyle = this.team === 'player' ? '#00ff00' : '#ff0000';
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
        
        this.keys = {};
        this.mouse = new Vector2(0, 0);
        
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        
        this.setupEventListeners();
        this.setupShipBuilder();
        this.gameLoop();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.selectedShips.length > 0) {
                    const now = Date.now();
                    this.selectedShips.forEach(ship => {
                        ship.fireWeapons(this.projectiles, now);
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
        const builder = document.getElementById('shipBuilder');
        builder.classList.toggle('active');
        this.shipBuilderActive = builder.classList.contains('active');
    }
    
    spawnPlayerShip() {
        const ship = new Ship(
            this.canvas.width / 2 + this.camera.x,
            this.canvas.height / 2 + this.camera.y,
            'player'
        );
        
        // Add some default weapons and systems
        ship.addSection(new ShipSection('cannon', 'medium', 30, 0));
        ship.addSection(new ShipSection('cannon', 'medium', -30, 0));
        ship.addSection(new ShipSection('engine', 'medium', 0, 30));
        ship.addSection(new ShipSection('shield', 'medium', 0, -30));
        
        this.ships.push(ship);
        this.updateUI();
    }
    
    spawnEnemyShip() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 500;
        
        const ship = new Ship(
            this.canvas.width / 2 + this.camera.x + Math.cos(angle) * distance,
            this.canvas.height / 2 + this.camera.y + Math.sin(angle) * distance,
            'enemy'
        );
        
        // Enemy ship configuration
        ship.addSection(new ShipSection('laser', 'medium', 25, 0));
        ship.addSection(new ShipSection('laser', 'medium', -25, 0));
        ship.addSection(new ShipSection('missile', 'medium', 0, 25));
        ship.addSection(new ShipSection('engine', 'medium', 0, -25));
        
        this.ships.push(ship);
        this.updateUI();
    }
    
    reset() {
        this.ships = [];
        this.projectiles = [];
        this.particles = [];
        this.selectedShips = [];
        this.camera = new Vector2(0, 0);
        this.updateUI();
    }
    
    saveCurrentShip() {
        alert('Ship design saved! (Feature in development)');
    }
    
    update(dt) {
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
        this.ships.forEach(ship => ship.update(dt, this.ships, this.projectiles));
        
        // Update projectiles
        const currentTime = performance.now() / 1000;
        this.projectiles = this.projectiles.filter(proj => {
            proj.position = proj.position.add(proj.velocity.multiply(dt));
            
            // Check collision with ships
            for (const ship of this.ships) {
                if (!ship.alive || ship.team === proj.team) continue;
                
                const dist = ship.position.subtract(proj.position).length();
                if (dist < 30) {
                    ship.takeDamage(proj.damage);
                    
                    // Create explosion particles
                    for (let i = 0; i < 10; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 50 + Math.random() * 100;
                        this.particles.push({
                            position: proj.position,
                            velocity: new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
                            life: 0.5,
                            createdAt: currentTime,
                            color: proj.type === 'laser' ? '#00ffff' : '#ff8800'
                        });
                    }
                    
                    return false;
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
                this.camera.x += (targetCameraX - this.camera.x) * 0.05;
                this.camera.y += (targetCameraY - this.camera.y) * 0.05;
            }
        }
        
        // Clean up dead ships from selection
        this.selectedShips = this.selectedShips.filter(s => s.alive);
    }
    
    draw() {
        // Clear canvas with space background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 123 + this.camera.x * 0.1) % this.canvas.width;
            const y = (i * 456 + this.camera.y * 0.1) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            const screenPos = proj.position.subtract(this.camera);
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.8;
            
            const gradient = this.ctx.createRadialGradient(
                screenPos.x, screenPos.y, 0,
                screenPos.x, screenPos.y, proj.type === 'missile' ? 8 : 5
            );
            
            const color = proj.type === 'laser' ? '#00ffff' :
                         proj.type === 'missile' ? '#ffff00' :
                         proj.type === 'railgun' ? '#ff00ff' : '#ff8800';
            
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, color + '00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, proj.type === 'missile' ? 8 : 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // Draw particles
        const currentTime = performance.now() / 1000;
        this.particles.forEach(particle => {
            const screenPos = particle.position.subtract(this.camera);
            const age = currentTime - particle.createdAt;
            const alpha = 1 - (age / particle.life);
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);
            this.ctx.restore();
        });
        
        // Draw ships
        this.ships.forEach(ship => ship.draw(this.ctx, this.camera));
    }
    
    updateUI() {
        document.getElementById('shipCount').textContent = 
            `Ships: ${this.ships.filter(s => s.alive).length}`;
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
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
