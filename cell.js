// Cell class represents a single face/quad of the ground with 4 vertex heights
export default class Cell {
  constructor(x, z, step, heightGenerator) {
    this.x = x; // Bottom-left corner X coordinate
    this.z = z; // Bottom-left corner Z coordinate
    this.step = step; // Size of the cell

    // Pre-generate heights for all 4 vertices of this cell
    this.h1 = heightGenerator(x, z); // Bottom-left
    this.h2 = heightGenerator(x + step, z); // Bottom-right
    this.h3 = heightGenerator(x + step, z + step); // Top-right
    this.h4 = heightGenerator(x, z + step); // Top-left

    // Store vertices for easy access
    this.vertices = [
      [x, this.h1, z],
      [x + step, this.h2, z],
      [x + step, this.h3, z + step],
      [x, this.h4, z + step],
    ];
  }

  // Get interpolated height at any point within this cell
  getHeightAt(localX, localZ) {
    // Normalize coordinates to [0,1] within the cell
    const u = (localX - this.x) / this.step;
    const v = (localZ - this.z) / this.step;

    // Bilinear interpolation
    const h12 = this.h1 * (1 - u) + this.h2 * u; // Bottom edge
    const h43 = this.h4 * (1 - u) + this.h3 * u; // Top edge

    return h12 * (1 - v) + h43 * v; // Final interpolated height
  }

  // Check if a point is within this cell
  contains(x, z) {
    return (
      x >= this.x &&
      x < this.x + this.step &&
      z >= this.z &&
      z < this.z + this.step
    );
  }
}
