/**
 * FastTrigonometry - Optimized trigonometric functions for 3D graphics
 *
 * This class provides multiple optimized implementations of sin/cos functions
 * designed for performance in real-time 3D applications.
 */

class FastTrigonometry {
  constructor(tableSize = 2048) {
    // Ensure table size is a power of 2 for bitwise operations
    this.tableSize = this.nextPowerOf2(tableSize);
    this.tableSizeMask = this.tableSize - 1;
    this.angleToIndex = this.tableSize / (2 * Math.PI);

    // Pre-calculated lookup tables
    this.sinTable = new Float32Array(this.tableSize + 1); // +1 for wraparound
    this.cosTable = new Float32Array(this.tableSize + 1);

    // Initialize lookup tables
    this.initializeTables();

    // Degree-based cache for common camera angles
    this.initializeDegreeCache();
  }

  /**
   * Find the next power of 2 greater than or equal to n
   */
  nextPowerOf2(n) {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  /**
   * Initialize the main lookup tables with pre-calculated values
   */
  initializeTables() {
    for (let i = 0; i <= this.tableSize; i++) {
      const angle = (i / this.tableSize) * 2 * Math.PI;
      this.sinTable[i] = Math.sin(angle);
      this.cosTable[i] = Math.cos(angle);
    }
  }

  /**
   * Initialize degree-based cache for common camera angles (0-360 degrees)
   */
  initializeDegreeCache() {
    this.sinDegreeCache = new Float32Array(361); // 0-360 inclusive
    this.cosDegreeCache = new Float32Array(361);

    for (let i = 0; i <= 360; i++) {
      const angle = (i * Math.PI) / 180;
      this.sinDegreeCache[i] = Math.sin(angle);
      this.cosDegreeCache[i] = Math.cos(angle);
    }
  }

  /**
   * Ultra-fast sine using direct lookup without interpolation
   * Best for real-time applications where speed > precision
   */
  ultraFastSin(angle) {
    // Fast angle normalization using bitwise operations
    const index = Math.floor(angle * this.angleToIndex) & this.tableSizeMask;
    return this.sinTable[index];
  }

  /**
   * Ultra-fast cosine using direct lookup without interpolation
   * Best for real-time applications where speed > precision
   */
  ultraFastCos(angle) {
    const index = Math.floor(angle * this.angleToIndex) & this.tableSizeMask;
    return this.cosTable[index];
  }

  /**
   * Fast sine with simple angle normalization
   * Good balance of speed and accuracy
   */
  fastSin(angle) {
    // Simple angle normalization for better accuracy
    if (angle < 0) angle = -angle;
    const index = Math.floor(angle * this.angleToIndex) % this.tableSize;
    return this.sinTable[index];
  }

  /**
   * Fast cosine with simple angle normalization
   * Good balance of speed and accuracy
   */
  fastCos(angle) {
    if (angle < 0) angle = -angle;
    const index = Math.floor(angle * this.angleToIndex) % this.tableSize;
    return this.cosTable[index];
  }

  /**
   * Degree-based sine for common camera angles
   * Optimized for angles in degrees (0-360)
   */
  sinDegrees(angleDegrees) {
    const deg = Math.floor(Math.abs(angleDegrees)) % 360;
    return angleDegrees < 0
      ? -this.sinDegreeCache[deg]
      : this.sinDegreeCache[deg];
  }

  /**
   * Degree-based cosine for common camera angles
   * Optimized for angles in degrees (0-360)
   */
  cosDegrees(angleDegrees) {
    const deg = Math.floor(Math.abs(angleDegrees)) % 360;
    return this.cosDegreeCache[deg];
  }

  /**
   * Precise sine with linear interpolation
   * Higher accuracy but slower than ultra-fast version
   */
  preciseSin(angle) {
    // Normalize angle to [0, 2π]
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    // Convert to table index with fractional part
    const exactIndex = angle * this.angleToIndex;
    const index = Math.floor(exactIndex);
    const nextIndex = (index + 1) & this.tableSizeMask;

    // Linear interpolation
    const t = exactIndex - index;
    return this.sinTable[index] * (1 - t) + this.sinTable[nextIndex] * t;
  }

  /**
   * Precise cosine with linear interpolation
   * Higher accuracy but slower than ultra-fast version
   */
  preciseCos(angle) {
    // Normalize angle to [0, 2π]
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    // Convert to table index with fractional part
    const exactIndex = angle * this.angleToIndex;
    const index = Math.floor(exactIndex);
    const nextIndex = (index + 1) & this.tableSizeMask;

    // Linear interpolation
    const t = exactIndex - index;
    return this.cosTable[index] * (1 - t) + this.cosTable[nextIndex] * t;
  }

  /**
   * Get performance statistics about the lookup tables
   */
  getStats() {
    return {
      tableSize: this.tableSize,
      tableSizeMask: this.tableSizeMask,
      angleToIndex: this.angleToIndex,
      memoryUsage: {
        sinTable: this.sinTable.byteLength,
        cosTable: this.cosTable.byteLength,
        sinDegreeCache: this.sinDegreeCache.byteLength,
        cosDegreeCache: this.cosDegreeCache.byteLength,
        total:
          this.sinTable.byteLength +
          this.cosTable.byteLength +
          this.sinDegreeCache.byteLength +
          this.cosDegreeCache.byteLength,
      },
    };
  }
}

// Create and export a singleton instance
const fastTrigonometry = new FastTrigonometry(2048);

// Export the class and singleton instance
export default FastTrigonometry;
export { fastTrigonometry };

// Export convenient function aliases for backward compatibility
export function ultraFastSin(angle) {
  return Math.sin(angle);
  //   return fastTrigonometry.ultraFastSin(angle);
}

export function ultraFastCos(angle) {
  return Math.cos(angle);
  //   return fastTrigonometry.ultraFastCos(angle);
}

export function fastSin(angle) {
  return fastTrigonometry.fastSin(angle);
}

export function fastCos(angle) {
  return fastTrigonometry.fastCos(angle);
}

export function preciseSin(angle) {
  return fastTrigonometry.preciseSin(angle);
}

export function preciseCos(angle) {
  return fastTrigonometry.preciseCos(angle);
}

export function sinDegrees(angleDegrees) {
  return fastTrigonometry.sinDegrees(angleDegrees);
}

export function cosDegrees(angleDegrees) {
  return fastTrigonometry.cosDegrees(angleDegrees);
}
