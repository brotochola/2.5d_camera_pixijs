import Object3D from "./Object3D.js";
import { calculateShadedColor, calculateDistanceFactor } from "./utils.js";

// Cell class represents a single face/quad of the ground with 4 vertex heights
export default class Cell extends Object3D {
  constructor(x, z, step, heightGenerator, game) {
    // Call parent constructor with center position
    const centerX = x + step / 2;
    const centerZ = z + step / 2;
    const centerY = heightGenerator ? heightGenerator(centerX, centerZ) : 0;

    super(centerX, centerY, centerZ, null, game);

    this.cellX = x; // Bottom-left corner X coordinate
    this.cellZ = z; // Bottom-left corner Z coordinate
    this.step = step; // Size of the cell
    this.color = 0x99ff99; // Default ground color

    // Pre-generate heights for all 4 vertices of this cell
    this.h1 = heightGenerator ? heightGenerator(x, z) : 0; // Bottom-left
    this.h2 = heightGenerator ? heightGenerator(x + step, z) : 0; // Bottom-right
    this.h3 = heightGenerator ? heightGenerator(x + step, z + step) : 0; // Top-right
    this.h4 = heightGenerator ? heightGenerator(x, z + step) : 0; // Top-left

    // Store vertices for easy access
    this.vertices = [
      [x, this.h1, z],
      [x + step, this.h2, z],
      [x + step, this.h3, z + step],
      [x, this.h4, z + step],
    ];

    // Create graphics object for this cell
    this.graphics = new PIXI.Graphics();
    this.graphics.owner = this;
    this.container.addChild(this.graphics);
  }

  // Get interpolated height at any point within this cell
  getHeightAt(localX, localZ) {
    // Normalize coordinates to [0,1] within the cell
    const u = (localX - this.cellX) / this.step;
    const v = (localZ - this.cellZ) / this.step;

    // Bilinear interpolation
    const h12 = this.h1 * (1 - u) + this.h2 * u; // Bottom edge
    const h43 = this.h4 * (1 - u) + this.h3 * u; // Top edge

    return h12 * (1 - v) + h43 * v; // Final interpolated height
  }

  // Check if a point is within this cell
  contains(x, z) {
    return (
      x >= this.cellX &&
      x < this.cellX + this.step &&
      z >= this.cellZ &&
      z < this.cellZ + this.step
    );
  }

  // Override the render method to handle cell-specific rendering
  render(camera, darkenFactor = 0.7) {
    // Project all vertices
    const projectedVertices = this.vertices
      .map((vertex) => camera.project3D(vertex[0], vertex[1], vertex[2]))
      .filter((v) => v !== null);

    if (!projectedVertices || !projectedVertices.length) {
      this.visible = false;
      this.container.visible = false;
      return;
    }

    // Skip rendering if no vertices are visible (proper frustum culling)
    // A cell should be rendered if at least one vertex is visible, or if it might span the screen
    const visibleVertices = projectedVertices.filter((v) => v.isVisible);
    const hasVisibleVertices = visibleVertices.length > 0;

    // Also check if the cell might be spanning the screen (large cell partially visible)
    const minX = Math.min(...projectedVertices.map((v) => v.x));
    const maxX = Math.max(...projectedVertices.map((v) => v.x));
    const minY = Math.min(...projectedVertices.map((v) => v.y));
    const maxY = Math.max(...projectedVertices.map((v) => v.y));

    const spansScreen =
      minX < camera.width && maxX > 0 && minY < camera.height && maxY > 0;

    // Skip rendering if no vertices are visible AND cell doesn't span the screen
    if (!hasVisibleVertices && !spansScreen) {
      this.visible = false;
      this.container.visible = false;
      return;
    }

    // Get the minimum Z value from projected vertices
    const vertexThatIsTheFurtherAway = Math.max(
      ...projectedVertices.map((v) => v.z)
    );
    this.establishZindexFromDistanceToCamera(vertexThatIsTheFurtherAway);

    // // Calculate average Z for distance-based shading
    // const avgZ =
    //   projectedVertices.reduce((sum, v) => sum + v.z, 0) /
    //   projectedVertices.length;

    // Skip if too far away
    if (vertexThatIsTheFurtherAway > camera.maxDistanceToRender) {
      this.visible = false;
      this.container.visible = false;
      return;
    }

    // Calculate distance-based color
    const maxDistance = camera.maxDistanceToRender * 0.9;
    const minDistance = 5;
    const distanceFactor = calculateDistanceFactor(
      vertexThatIsTheFurtherAway,
      minDistance,
      maxDistance
    );
    const shadedColor = calculateShadedColor(
      this.color,
      distanceFactor,
      darkenFactor
    );

    // Clear and redraw the cell
    this.graphics.clear();
    this.visible = true;
    this.container.visible = true;

    // Draw the cell face
    this.graphics.beginFill(shadedColor);
    this.graphics.moveTo(projectedVertices[0].x, projectedVertices[0].y);

    for (let i = 1; i < projectedVertices.length; i++) {
      this.graphics.lineTo(projectedVertices[i].x, projectedVertices[i].y);
    }

    this.graphics.closePath();
    this.graphics.endFill();

    // Add subtle outline
    this.graphics.lineStyle(1, 0x000000, 0.1);
    this.graphics.moveTo(projectedVertices[0].x, projectedVertices[0].y);
    for (let i = 1; i < projectedVertices.length; i++) {
      this.graphics.lineTo(projectedVertices[i].x, projectedVertices[i].y);
    }
    this.graphics.closePath();
    this.graphics.lineStyle(0);
  }

  // Override update method since cells don't move
  update() {
    // Cells are static, no need to update position
    // But we might want to update other properties if needed
  }

  destroy() {
    if (this.graphics) {
      this.game.app.stage.removeChild(this.graphics);
      this.graphics.destroy();
    }
  }
}
