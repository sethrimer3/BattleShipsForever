# Battleships Forever - HTML5 Edition

An HTML5 web-based recreation of the space RTS game "Battleships Forever" by Sean "th15" Chan.

## 🎮 Play Now

**[Play the game here!](https://sethrimer3.github.io/BattleShipsForever/)**

## 📋 About

This is an HTML5 adaptation of the original Battleships Forever space combat RTS game. Build modular spacecraft from various sections and weapons, then engage in real-time space battles in sandbox mode.

The original game was a unique space combat game where you construct ships from modular sections, each with different properties, weapons, and systems. This web version recreates the core mechanics in a browser-friendly format.

### Features

- 🚀 Real-time space combat with physics-based movement
- 🔧 Modular ship construction system
- ⚔️ Multiple weapon types (Cannons, Lasers, Missiles, Railguns)
- 🎯 Direct ship control with WASD movement and rotation
- 🤖 AI-controlled enemy ships
- 💥 Dynamic combat with projectiles and explosions
- 🎨 Glowing section graphics inspired by the original
- 📊 Real-time damage and destruction system

## 🚀 How to Play

### Controls

- **WASD** - Move your selected ship
- **Q/E** - Rotate ship left/right
- **SPACE** - Fire all weapons
- **Click** - Select a ship
- **Shift+Click** - Add to selection
- **Right Click** - Issue move order

### Building Ships

1. Click "Ship Builder" to open the ship design panel
2. Select sections (Core, Weapons, Utility)
3. Click "Deploy Ship" to spawn a ship with your design
4. Ships automatically have sections attached for quick battles

### Combat

1. Click "Deploy Ship" to create your ship
2. Click "Spawn Enemy" to create enemy ships
3. Select your ship and use WASD to maneuver
4. Press SPACE to fire weapons
5. Use Q/E to rotate and aim
6. Right-click to issue move orders

## 🛠️ Technical Details

This implementation uses:
- Pure HTML5 Canvas for rendering
- Vanilla JavaScript with ES6+ classes
- 2D physics engine for movement and collisions
- Real-time projectile simulation
- Particle effects system

### Files Structure
```
├── index.html      # Main game page with UI
├── game.js         # Game engine, physics, and rendering
├── ORIGINAL/       # Original Windows game files
└── README.md       # This file
```

### Ship Section Types

- **Core** - Central ship component (Large/Medium/Small)
- **Cannon** - Rapid-fire projectile weapon
- **Laser** - Fast, continuous beam weapon
- **Missile** - Slow, high-damage weapon
- **Railgun** - High-speed, penetrating weapon
- **Engine** - Provides additional thrust
- **Shield** - Adds shield protection
- **Armor** - Increases damage resistance

## 🌐 GitHub Pages Deployment

This game is automatically deployed to GitHub Pages. Any changes pushed to the main branch will be live at:
`https://[username].github.io/BattleShipsForever/`

### Setting Up GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select the branch you want to deploy (usually `main` or `master`)
4. Select the root folder (`/`)
5. Click "Save"
6. Your site will be published at `https://[username].github.io/[repository-name]/`

## 📁 Original Game

The `ORIGINAL` directory contains the original Battleships Forever Windows game (v0.90c) by Sean "th15" Chan (Copyright 2007-2009). This includes:
- BattleshipsForever.exe - Main game executable
- ShipMaker.exe - Ship design tool
- Custom ship files (.shp format)
- PNG sprites for ship sections
- Sound effects and music files

This HTML5 version is inspired by and based on the original game's mechanics.

## 🎯 Future Enhancements

Potential improvements that could be added:
- 🧠 Advanced AI with tactical behaviors
- 🎨 Load original .shp ship files from the ORIGINAL folder
- 🖼️ Import PNG sprites from Custom sprites folder
- 🏗️ Full ship builder interface with section placement
- 📜 Campaign missions with objectives
- 🎵 Sound effects and background music (from ORIGINAL)
- 👥 Multiplayer support
- 💾 Save/load custom ship designs
- ⚡ More weapon types and special abilities
- 🌌 Parallax space backgrounds

## 🤝 Contributing

This is an open-source project. Feel free to:
- Report bugs or suggest features via GitHub Issues
- Submit pull requests with improvements
- Fork the project and create your own version

## 📄 License

The HTML5 version is provided as-is for educational and entertainment purposes. The original Battleships Forever game and concept are copyright Sean "th15" Chan (2007-2009).

This web adaptation is a fan project to make the game accessible in modern browsers.

## 🙏 Credits

- Original Game: Sean "th15" Chan - [Wyrdysm.com](https://www.wyrdysm.com)
- HTML5 Adaptation: GitHub Community
- Ship Emojis: Unicode Standard

---

**Enjoy the game! ⚓🎮**
