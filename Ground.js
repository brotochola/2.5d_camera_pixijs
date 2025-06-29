import Object3D from "./Object3D.js";
import { calculateShadedColor, calculateDistanceFactor } from "./utils.js";
import Cell from "./cell.js";
import { ALTITUDES } from "./Game.js";

class Ground extends Object3D {
  constructor(size = 20, step = 2.2, game) {
    super(0, 0, 0, null, game); // Ground is at origin
    this.vertices = [];
    this.faces = [];
    this.cells = []; // Array to store Cell objects
    this.color = 0x99ff99;
    this.size = size;
    this.step = step;
    this.numberOfVisibleFaces = 0;
    this.ratioOfVisibleFaces = 0;

    this.generateGroundMesh(size, step);
  }

  regenerate(size, step = this.step) {
    // Clean up existing cells
    this.destroyCells();

    this.size = size;
    this.step = step;
    this.generateGroundMesh(size, step);
  }

  destroyCells() {
    // Destroy all existing cell graphics
    for (const cell of this.cells) {
      cell.destroy();
    }
    this.cells = [];
  }

  getCellAt(x, z) {
    return this.cells.find((c) => c.contains(x, z));
  }

  generateGroundMesh(size, step = this.step) {
    this.vertices = [];
    this.faces = [];
    this.cells = [];

    // Create cells (faces) with pre-generated heights
    for (let x = -size * 2; x <= size * 2; x += step) {
      for (let z = -size * 2; z <= size * 2; z += step) {
        // Create a new cell with pre-generated heights
        const cell = new Cell(
          x,
          z,
          step,
          (x, z) => (ALTITUDES ? this.generateHeightAt(x, z) : 0),
          this.game
        );
        this.cells.push(cell);

        // Add vertices from the cell to our vertex array for getYAt method
        this.vertices.push(...cell.vertices);

        // Create face indices (kept for compatibility with getYAt)
        const baseIndex = this.vertices.length - 4;
        this.faces.push([
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex + 3,
        ]);
      }
    }
  }

  // Method to generate terrain height at a given x, z position
  generateHeightAt(x, z) {
    // Create terrain with multiple layers of noise for natural variation
    const scale1 = 0.05; // Large hills
    const scale2 = 0.15; // Medium features
    const scale3 = 0.3; // Small details

    const height1 = Math.sin(x * scale1) * Math.cos(z * scale1) * 8;
    const height2 = Math.sin(x * scale2) * Math.cos(z * scale2) * 3;
    const height3 = Math.sin(x * scale3) * Math.cos(z * scale3) * 1;

    // Add some ridge-like features
    const ridge =
      Math.abs(Math.sin(x * 0.08)) * Math.abs(Math.cos(z * 0.08)) * 5;

    return height1 + height2 + height3 + ridge;
  }

  // Method to get height at any world position using cell lookup and interpolation
  getYAt(x, z) {
    // Find the cell that contains this position
    const cell = this.getCellAt(x, z);

    if (cell) {
      return cell.getHeightAt(x, z);
    }

    // Fallback: generate height if no cell found (outside generated area)
    console.warn(`No cell found for position (${x}, ${z}), generating height`);
    return this.generateHeightAt(x, z);
  }

  render(camera, darkenFactor = 0.7) {
    // Reset counters
    this.numberOfVisibleFaces = 0;

    // Render each cell individually
    for (const cell of this.cells) {
      cell.render(camera, darkenFactor);

      // Count visible cells
      if (cell.container.visible) {
        this.numberOfVisibleFaces++;
      }
    }

    this.ratioOfVisibleFaces = this.numberOfVisibleFaces / this.faces.length;
  }

  // Get all cells for zIndex sorting
  getCells() {
    return this.cells;
  }

  destroy() {
    this.destroyCells();
  }
}

export default Ground;
