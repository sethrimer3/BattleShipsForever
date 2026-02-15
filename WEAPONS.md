# Ship Weapons Documentation

## Overview
The game features 5 distinct weapon types, each with unique visual effects and behaviors based on the original Battleships Forever game.

## Weapon Types

### 1. Light Cannon (cannon_01)
- **Fire Rate**: 500ms
- **Damage**: 20
- **Projectile Speed**: 300 units/s
- **Visual Effects**:
  - Orange/yellow muzzle flash on firing
  - Glowing orange projectile with shadow effects
  - Standard projectile behavior
- **Sprite**: BSF_Stock04.png

### 2. Heavy Cannon (cannon_02)
- **Fire Rate**: 800ms
- **Damage**: 35
- **Projectile Speed**: 300 units/s
- **Visual Effects**: Same as Light Cannon but higher damage
- **Sprite**: BSF_Stock05.png

### 3. Laser Turret (laser_01)
- **Fire Rate**: 200ms (rapid fire)
- **Damage**: 10
- **Projectile Speed**: 300 units/s
- **Projectile Lifetime**: 0.5s (short range)
- **Visual Effects**:
  - Cyan muzzle flash
  - Beam visual from ship to impact point
  - Bright cyan glow at projectile position
  - Shadow/glow effects for visibility
- **Sprite**: BSF_Stock06.png

### 4. Missile Launcher (missile_01)
- **Fire Rate**: 2000ms (slow)
- **Damage**: 50 (high damage)
- **Projectile Speed**: 150 units/s (slower than other weapons)
- **Special Behavior**: **HOMING** - Missiles track the nearest enemy target
  - Automatically acquires nearest enemy ship
  - Gradually turns towards target
  - Turn rate: 0.05 radians per frame
  - Reacquires new target if current target is destroyed
- **Visual Effects**:
  - Yellow muzzle flash
  - Large yellow projectile with white core
  - Orange exhaust trail behind missile
  - Enhanced glow and shadow effects
- **Sprite**: BSF_Stock07.png

### 5. Railgun (railgun_01)
- **Fire Rate**: 1500ms
- **Damage**: 40
- **Projectile Speed**: 500 units/s (fastest)
- **Special Behavior**: **PENETRATION** - Can hit multiple targets in a line
  - Does not stop after hitting first target
  - Can damage all ships in its path
  - Tracks hit targets to avoid double-hitting
- **Visual Effects**:
  - Magenta/purple muzzle flash
  - Bright purple projectile with white core
  - Motion blur trail effect
  - Enhanced shadow and glow effects
- **Sprite**: BSF_Stock08.png

## Visual Effects System

### Muzzle Flashes
All weapons display a muzzle flash when fired:
- Duration: 100ms
- Fades out over time
- Color-coded by weapon type
- Radial gradient effect centered on weapon

### Projectile Effects
Each projectile type has distinct visuals:
- **Gradients**: Radial gradients from bright center to transparent edge
- **Shadows**: Shadow blur effects for depth and visibility
- **Trails**: Motion blur or exhaust trails for missiles and railguns
- **Colors**: 
  - Cannon: Orange (#ff8800)
  - Laser: Cyan (#00ffff)
  - Missile: Yellow (#ffff00)
  - Railgun: Magenta (#ff00ff)

### Hit Effects
On impact, all weapons create:
- Explosion particles (10 particles)
- Radial particle scatter
- Color-coded particle effects
- Particle lifetime: 0.5s

## Sprite Integration

Weapon sprites are loaded from the catalog and applied to ship sections:
- Sprites are automatically loaded when ship editor initializes
- Each weapon has a unique sprite from the BSF_Stock series
- Sprites scale dynamically based on weapon radius
- Fallback to colored circles if sprite fails to load

## Usage in Ship Editor

1. Open Ship Builder panel
2. Select a weapon from the WEAPONS category
3. Click on canvas to place weapon on ship
4. Weapon inherits all properties from catalog.json
5. Export ship design as JSON for later use

## Technical Implementation

### Weapon Properties (from catalog.json)
```json
{
  "id": "weapon_id",
  "name": "Display Name",
  "file": "sprite_file.png",
  "type": "weapon_type",
  "health": 80,
  "mass": 8,
  "fireRate": 500,
  "damage": 20
}
```

### Projectile Object Structure
```javascript
{
  position: Vector2,
  velocity: Vector2,
  damage: Number,
  type: String,
  team: String,
  life: Number,
  createdAt: Number,
  angle: Number,
  owner: Ship,
  // Missile-specific
  homing: Boolean,
  target: Ship,
  turnRate: Number,
  // Railgun-specific
  penetration: Boolean,
  hitTargets: Array
}
```

## Performance Considerations

- Muzzle flashes are time-limited (100ms) to avoid memory leaks
- Projectiles are automatically removed after lifetime expires
- Particle effects have limited lifetime (0.5s)
- Sprite caching prevents redundant loads
- Shadow effects use canvas shadowBlur for hardware acceleration

## Future Enhancements

Potential additions for weapon system:
- Sound effects for each weapon type
- Weapon cooldown indicators on UI
- Weapon ammo/energy system
- Additional weapon types (plasma, torpedoes, etc.)
- Weapon upgrades and modifications
- AOE (Area of Effect) weapons
- Shield interactions with different weapon types
