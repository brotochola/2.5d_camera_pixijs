import Object3D from "./Object3D.js";
import { calculateShadedColor, calculateDistanceFactor } from "./utils.js";
import Cell from "./cell.js";
import { ALTITUDES } from "./Game.js";

class Ground extends Object3D {
  constructor(size = 20, step = 2.2) {
    super(0, 0, 0); // Ground is at origin
    this.vertices = [];
    this.faces = [];
    this.cells = []; // Array to store Cell objects
    this.color = 0x99ff99;
    this.size = size;
    this.step = step;
    this.numberOfVisibleFaces = 0;
    this.ratioOfVisibleFaces = 0;
    this.graphics = new PIXI.Graphics();
    this.generateGroundMesh(size, step);
  }

  regenerate(size, step = this.step) {
    this.size = size;
    this.step = step;
    this.generateGroundMesh(size, step);
  }

  generateGroundMesh(size, step = this.step) {
    this.vertices = [];
    this.faces = [];
    this.cells = [];

    // Create cells (faces) with pre-generated heights
    for (let x = -size * 2; x <= size * 2; x += step) {
      for (let z = -size * 2; z <= size * 2; z += step) {
        // Create a new cell with pre-generated heights
        const cell = new Cell(x, z, step, (x, z) =>
          ALTITUDES ? this.generateHeightAt(x, z) : 0
        );
        this.cells.push(cell);

        // Add vertices from the cell to our vertex array for rendering
        const baseIndex = this.vertices.length;
        this.vertices.push(...cell.vertices);

        // Create face indices
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
    const cell = this.cells.find((c) => c.contains(x, z));

    if (cell) {
      return cell.getHeightAt(x, z);
    }

    // Fallback: generate height if no cell found (outside generated area)
    console.warn(`No cell found for position (${x}, ${z}), generating height`);
    return this.generateHeightAt(x, z);
  }

  render(camera, darkenFactor = 0.7) {
    // console.log("render ground");
    const projectedVertices = [];

    for (const vertex of this.vertices) {
      const worldX = vertex[0] + this.x;
      const worldY = vertex[1] + this.y;
      const worldZ = vertex[2] + this.z;

      const projected = camera.project3D(worldX, worldY, worldZ);
      projectedVertices.push(projected);
    }

    this.graphics.clear();
    this.numberOfVisibleFaces = 0;

    // Create array of face data with depth information for sorting
    const faceData = [];

    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      const faceVertices = face
        .map((vertexIndex) => projectedVertices[vertexIndex])
        .filter((v) => v !== null);

      if (faceVertices.length >= 3 && faceVertices.some((v) => v.isVisible)) {
        const avgZ =
          faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;

        // Skip faces that are too far away
        if (avgZ > camera.maxDistanceToRender) {
          continue;
        }

        faceData.push({
          face: face,
          faceVertices: faceVertices,
          avgZ: avgZ,
        });
      }
    }

    // Sort faces by average Z distance (back to front)
    faceData.sort((a, b) => b.avgZ - a.avgZ);

    // Render sorted faces
    for (const data of faceData) {
      this.numberOfVisibleFaces++;

      const maxDistance = camera.maxDistanceToRender * 0.9;
      const minDistance = 5;

      const distanceFactor = calculateDistanceFactor(
        data.avgZ,
        minDistance,
        maxDistance
      );
      const shadedColor = calculateShadedColor(
        this.color,
        distanceFactor,
        darkenFactor
      );

      this.graphics.beginFill(shadedColor);
      this.graphics.moveTo(data.faceVertices[0].x, data.faceVertices[0].y);

      for (let i = 1; i < data.faceVertices.length; i++) {
        this.graphics.lineTo(data.faceVertices[i].x, data.faceVertices[i].y);
      }

      this.graphics.closePath();
      this.graphics.endFill();

      this.graphics.lineStyle(1, 0x000000, 0.1);
      this.graphics.moveTo(data.faceVertices[0].x, data.faceVertices[0].y);
      for (let i = 1; i < data.faceVertices.length; i++) {
        this.graphics.lineTo(data.faceVertices[i].x, data.faceVertices[i].y);
      }
      this.graphics.closePath();
      this.graphics.lineStyle(0);
    }

    this.ratioOfVisibleFaces = this.numberOfVisibleFaces / this.faces.length;
  }
}

export default Ground;
