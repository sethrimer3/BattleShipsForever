// Ship Editor Module for Battleships Forever
// Handles ship design, sprite loading, and JSON export/import

class SpriteLoader {
    constructor() {
        this.sprites = new Map();
        this.catalog = null;
        this.loaded = false;
    }
    
    async loadCatalog() {
        try {
            const response = await fetch('assets/sprites/catalog.json');
            this.catalog = await response.json();
            return this.catalog;
        } catch (error) {
            console.error('Failed to load sprite catalog:', error);
            return null;
        }
    }
    
    async loadSprite(filename) {
        if (this.sprites.has(filename)) {
            return this.sprites.get(filename);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites.set(filename, img);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load sprite: ${filename}`);
                reject(new Error(`Failed to load sprite: ${filename}`));
            };
            img.src = `assets/sprites/${filename}`;
        });
    }
    
    async preloadAllSprites() {
        if (!this.catalog) {
            await this.loadCatalog();
        }
        
        const allSprites = [];
        for (const category in this.catalog.sprites) {
            for (const part of this.catalog.sprites[category]) {
                allSprites.push(part.file);
            }
        }
        
        const uniqueSprites = [...new Set(allSprites)];
        await Promise.all(uniqueSprites.map(file => this.loadSprite(file)));
        this.loaded = true;
    }
    
    getSprite(filename) {
        return this.sprites.get(filename);
    }
    
    getAllParts() {
        if (!this.catalog) return [];
        
        const parts = [];
        for (const category in this.catalog.sprites) {
            for (const part of this.catalog.sprites[category]) {
                parts.push({
                    ...part,
                    category
                });
            }
        }
        return parts;
    }
    
    getPartById(id) {
        const parts = this.getAllParts();
        return parts.find(part => part.id === id);
    }
}

class ShipEditor {
    constructor(game) {
        this.game = game;
        this.spriteLoader = new SpriteLoader();
        this.currentShip = {
            name: "Custom Ship",
            description: "",
            sections: []
        };
        this.selectedPart = null;
        this.placementMode = false;
        this.draggedSection = null;
        this.snapToGrid = true;
        this.gridSize = 16;
        
        this.editorCanvas = null;
        this.editorCtx = null;
        this.editorActive = false;
    }
    
    async initialize() {
        await this.spriteLoader.preloadAllSprites();
        this.setupEditorUI();
    }
    
    setupEditorUI() {
        // This will be called to update the ship builder UI with sprite-based parts
        const builderDiv = document.getElementById('shipBuilder');
        if (!builderDiv) return;
        
        // Clear existing content
        const categories = builderDiv.querySelectorAll('.section-category');
        categories.forEach(cat => cat.remove());
        
        // Add new sprite-based categories
        const catalog = this.spriteLoader.catalog;
        if (!catalog) return;
        
        const h3 = builderDiv.querySelector('h3');
        const p = builderDiv.querySelector('p');
        
        for (const [categoryName, parts] of Object.entries(catalog.sprites)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'section-category';
            
            const h4 = document.createElement('h4');
            h4.textContent = categoryName.toUpperCase();
            categoryDiv.appendChild(h4);
            
            const grid = document.createElement('div');
            grid.className = 'sprite-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(60px, 1fr))';
            grid.style.gap = '5px';
            grid.style.marginBottom = '10px';
            
            for (const part of parts) {
                const btn = document.createElement('button');
                btn.className = 'sprite-btn';
                btn.dataset.partId = part.id;
                btn.title = part.name;
                btn.style.cssText = `
                    width: 60px;
                    height: 60px;
                    padding: 5px;
                    background: #002200;
                    border: 1px solid #004400;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                `;
                
                const sprite = this.spriteLoader.getSprite(part.file);
                if (sprite) {
                    const img = document.createElement('img');
                    img.src = sprite.src;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    img.style.objectFit = 'contain';
                    btn.appendChild(img);
                }
                
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.sprite-btn').forEach(b => {
                        b.style.borderColor = '#004400';
                        b.style.background = '#002200';
                    });
                    btn.style.borderColor = '#00ff00';
                    btn.style.background = '#004400';
                    this.selectPart(part);
                });
                
                grid.appendChild(btn);
            }
            
            categoryDiv.appendChild(grid);
            
            // Insert before the save button
            const saveBtn = builderDiv.querySelector('.btn');
            if (saveBtn && saveBtn.parentElement) {
                builderDiv.insertBefore(categoryDiv, saveBtn.parentElement);
            } else {
                builderDiv.appendChild(categoryDiv);
            }
        }
        
        // Update save button
        const saveBtn = builderDiv.querySelector('.btn');
        if (saveBtn) {
            saveBtn.onclick = () => this.exportShipDesign();
        }
        
        // Add import button
        if (!document.getElementById('importShipBtn')) {
            const importBtn = document.createElement('button');
            importBtn.id = 'importShipBtn';
            importBtn.className = 'btn';
            importBtn.style.width = '100%';
            importBtn.style.marginTop = '5px';
            importBtn.textContent = 'Import Ship Design';
            importBtn.onclick = () => this.importShipDesign();
            saveBtn.parentElement.appendChild(importBtn);
        }
        
        // Add clear button
        if (!document.getElementById('clearShipBtn')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clearShipBtn';
            clearBtn.className = 'btn';
            clearBtn.style.width = '100%';
            clearBtn.style.marginTop = '5px';
            clearBtn.textContent = 'Clear Design';
            clearBtn.onclick = () => this.clearCurrentShip();
            saveBtn.parentElement.appendChild(clearBtn);
        }
    }
    
    selectPart(part) {
        this.selectedPart = part;
        this.placementMode = true;
    }
    
    addPartToShip(part, x, y, rotation = 0) {
        const section = {
            id: part.id,
            localX: x,
            localY: y,
            rotation: rotation,
            partData: part
        };
        this.currentShip.sections.push(section);
    }
    
    removePartFromShip(index) {
        if (index >= 0 && index < this.currentShip.sections.length) {
            this.currentShip.sections.splice(index, 1);
        }
    }
    
    clearCurrentShip() {
        if (confirm('Clear current ship design?')) {
            this.currentShip.sections = [];
            this.game.currentShipDesign = [];
        }
    }
    
    exportShipDesign() {
        const shipName = prompt('Enter ship name:', this.currentShip.name || 'Custom Ship');
        if (!shipName) return;
        
        const shipDescription = prompt('Enter ship description (optional):', this.currentShip.description || '');
        
        const exportData = {
            version: "1.0",
            name: shipName,
            description: shipDescription,
            team: "player",
            timestamp: new Date().toISOString(),
            sections: this.currentShip.sections.map(section => ({
                id: section.id,
                localX: section.localX,
                localY: section.localY,
                rotation: section.rotation || 0
            }))
        };
        
        // Create download
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shipName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Ship "${shipName}" exported successfully!`);
    }
    
    importShipDesign() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const shipData = JSON.parse(event.target.result);
                    this.loadShipFromJSON(shipData);
                    alert(`Ship "${shipData.name}" loaded successfully!`);
                } catch (error) {
                    alert('Error loading ship: ' + error.message);
                    console.error('Import error:', error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    loadShipFromJSON(shipData) {
        // Validate version
        if (shipData.version !== "1.0") {
            console.warn(`Ship version ${shipData.version} may not be fully compatible`);
        }
        
        this.currentShip.name = shipData.name || "Imported Ship";
        this.currentShip.description = shipData.description || "";
        this.currentShip.sections = [];
        
        // Load sections
        for (const sectionData of shipData.sections) {
            const partData = this.spriteLoader.getPartById(sectionData.id);
            if (partData) {
                this.currentShip.sections.push({
                    id: sectionData.id,
                    localX: sectionData.localX,
                    localY: sectionData.localY,
                    rotation: sectionData.rotation || 0,
                    partData: partData
                });
            } else {
                console.warn(`Part not found: ${sectionData.id}`);
            }
        }
        
        // Update game's current ship design
        this.game.currentShipDesign = this.currentShip.sections;
    }
    
    createShipFromDesign(x, y, team = 'player') {
        const ship = new Ship(x, y, team);
        
        // Clear default sections
        ship.sections = [];
        
        // Add sections from design
        for (const designSection of this.currentShip.sections) {
            const part = designSection.partData;
            const section = new ShipSection(
                part.type,
                part.size || 'medium',
                designSection.localX,
                designSection.localY
            );
            
            // Set sprite
            section.sprite = this.spriteLoader.getSprite(part.file);
            section.spriteFile = part.file;
            section.partId = part.id;
            
            // Apply part properties
            if (part.health) section.maxHealth = section.health = part.health;
            if (part.fireRate) section.fireRate = part.fireRate;
            if (part.damage) section.damage = part.damage;
            if (part.thrust) section.thrust = part.thrust;
            if (part.shieldStrength) section.shieldStrength = part.shieldStrength;
            if (part.armorValue) section.armorValue = part.armorValue;
            if (part.mass) section.mass = part.mass;
            
            ship.sections.push(section);
        }
        
        ship.updateProperties();
        return ship;
    }
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShipEditor, SpriteLoader };
}
