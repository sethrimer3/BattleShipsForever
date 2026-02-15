# Ship Parts Implementation Instructions

## Overview
This document provides guidelines for implementing new ship parts in the Battleships Forever HTML5 game. All ship parts must be compatible with the ship editor and JSON export/import system.

## Ship Part Structure

### JSON Format
Every ship part must follow this JSON structure:

```json
{
  "id": "unique_identifier",
  "name": "Human Readable Name",
  "file": "sprite_filename.png",
  "type": "category_type",
  "health": 100,
  "mass": 10,
  "localX": 0,
  "localY": 0,
  "rotation": 0,
  "properties": {}
}
```

### Required Fields
- **id**: Unique identifier (string) - must be unique across all ship parts
- **name**: Display name (string) - shown in the ship editor UI
- **file**: Sprite filename (string) - relative to assets/sprites/ directory
- **type**: Part category (string) - one of: core, cannon, laser, missile, railgun, engine, shield, armor, structure, special
- **health**: Hit points (number) - determines how much damage the part can take
- **mass**: Weight (number) - affects ship acceleration and maneuverability

### Optional Fields
- **localX**: X offset from ship center (number, default: 0)
- **localY**: Y offset from ship center (number, default: 0)
- **rotation**: Initial rotation in radians (number, default: 0)
- **properties**: Type-specific properties (object)

## Type-Specific Properties

### Core Parts
```json
{
  "type": "core",
  "size": "small|medium|large"
}
```

### Weapon Parts (cannon, laser, missile, railgun)
```json
{
  "type": "cannon|laser|missile|railgun",
  "fireRate": 500,
  "damage": 20,
  "projectileSpeed": 300,
  "projectileLife": 2.0
}
```

### Engine Parts
```json
{
  "type": "engine",
  "thrust": 50
}
```

### Shield Parts
```json
{
  "type": "shield",
  "shieldStrength": 50
}
```

### Armor Parts
```json
{
  "type": "armor",
  "armorValue": 30
}
```

### Structure Parts
```json
{
  "type": "structure"
}
```

## Adding New Ship Parts

### Step 1: Add Sprite Asset
1. Place your PNG sprite file in `/assets/sprites/`
2. Sprites should be transparent PNG format
3. Recommended size: 32x32 to 128x128 pixels
4. Use consistent art style with existing sprites

### Step 2: Update Sprite Catalog
Add your ship part definition to `/assets/sprites/catalog.json`:

```json
{
  "id": "new_weapon_01",
  "name": "Plasma Cannon",
  "file": "plasma_cannon.png",
  "type": "cannon",
  "health": 90,
  "mass": 9,
  "fireRate": 600,
  "damage": 25
}
```

Place it in the appropriate category array (cores, weapons, utility, structural, special).

### Step 3: Update Game Logic
If your ship part has unique behavior:

1. Open `/game.js`
2. Add type-specific logic in `ShipSection` constructor
3. Update `Ship.fireWeapons()` if it's a weapon
4. Update `Ship.updateProperties()` if it affects ship stats

### Step 4: Test
1. Open the game in a browser
2. Open Ship Builder panel
3. Verify your part appears in the correct category
4. Place the part on a ship
5. Export the ship as JSON
6. Verify the JSON contains correct part data
7. Import the JSON and verify the ship loads correctly

## Ship JSON Export Format

Ships are exported as JSON with this structure:

```json
{
  "version": "1.0",
  "name": "My Custom Ship",
  "description": "Description of the ship",
  "team": "player",
  "sections": [
    {
      "id": "core_medium_01",
      "localX": 0,
      "localY": 0,
      "rotation": 0
    },
    {
      "id": "cannon_01",
      "localX": 30,
      "localY": 0,
      "rotation": 0
    }
  ]
}
```

## Compatibility Requirements

### Must-Have Features
- ✅ All parts must have sprites in `/assets/sprites/`
- ✅ All parts must be registered in `/assets/sprites/catalog.json`
- ✅ All parts must support JSON serialization/deserialization
- ✅ All parts must render correctly in the ship editor
- ✅ All parts must render correctly in gameplay
- ✅ All parts must support rotation
- ✅ All parts must support positioning

### Best Practices
- Keep sprites consistent in art style
- Use meaningful IDs (e.g., `weapon_plasma_01` not `wp1`)
- Document unique behaviors in comments
- Test export/import thoroughly
- Ensure sprite transparency is correct
- Validate JSON structure before committing

## Version Compatibility

The ship JSON format uses semantic versioning:
- **Major version**: Breaking changes to JSON structure
- **Minor version**: New fields added (backward compatible)
- **Patch version**: Bug fixes, no format changes

Current version: **1.0**

When adding new fields, ensure backward compatibility by providing default values for missing fields.

## Testing Checklist

Before committing new ship parts:

- [ ] Sprite renders correctly in editor
- [ ] Sprite renders correctly in game
- [ ] Part appears in correct category
- [ ] Part can be placed on ship
- [ ] Part can be rotated
- [ ] Part can be moved
- [ ] Part can be deleted
- [ ] Ship with part can be exported to JSON
- [ ] Exported JSON is valid
- [ ] Ship can be imported from JSON
- [ ] All part properties work as expected
- [ ] Part works in combat (if applicable)
- [ ] Documentation updated

## Examples

### Example 1: Adding a New Weapon
```json
{
  "id": "torpedo_launcher_01",
  "name": "Torpedo Launcher",
  "file": "torpedo_launcher.png",
  "type": "missile",
  "health": 95,
  "mass": 12,
  "fireRate": 3000,
  "damage": 80,
  "projectileSpeed": 100,
  "projectileLife": 5.0
}
```

### Example 2: Adding a New Engine
```json
{
  "id": "afterburner_01",
  "name": "Afterburner",
  "file": "afterburner.png",
  "type": "engine",
  "health": 70,
  "mass": 8,
  "thrust": 100
}
```

### Example 3: Adding a Structural Piece
```json
{
  "id": "hull_wing_01",
  "name": "Wing Assembly",
  "file": "wing_assembly.png",
  "type": "structure",
  "health": 85,
  "mass": 7
}
```

## Support

For questions or issues:
1. Check existing ship parts in `catalog.json` for examples
2. Review the game code in `game.js`
3. Test thoroughly in the ship editor
4. Create an issue on GitHub if problems persist

## Future Enhancements

Planned features for ship parts:
- Animation support for engines and weapons
- Special effects (particles, glows)
- Connection point validation
- Auto-snap to grid
- Part grouping/modules
- Damage models per section
- Visual damage states
