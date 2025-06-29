import Object3D from "./Object3D.js";

// Crear sprite 3D con billboarding
export function createSprite3D(
  x,
  y,
  z,
  size = 1,
  color = 0xff0000,
  textureUrl = null,
  game,
  offsetX,
  offsetY
) {
  const sprite = new Object3D(x, y, z, textureUrl, game, offsetX, offsetY);
  sprite.size = size;
  sprite.color = color;
  sprite.isSprite = true;

  return sprite;
}

// Color manipulation utilities
export function calculateShadedColor(color, distanceFactor, darkenFactor) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  const darkFactor = 1 - distanceFactor * darkenFactor;
  const newR = Math.floor(r * darkFactor);
  const newG = Math.floor(g * darkFactor);
  const newB = Math.floor(b * darkFactor);

  return (newR << 16) | (newG << 8) | newB;
}

// Distance and position utilities
export function calculateDistance3D(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateDistanceFactor(distance, minDistance, maxDistance) {
  return Math.min(
    Math.max((distance - minDistance) / (maxDistance - minDistance), 0),
    1
  );
}

// Validation utilities
export function isValidProjection(projected) {
  return (
    projected &&
    projected.z > 0 &&
    isFinite(projected.x) &&
    isFinite(projected.y) &&
    projected.x > -1000 &&
    projected.x < 3000 &&
    projected.y > -1000 &&
    projected.y < 3000
  );
}

export function isInScreenBounds(x, y, width, height, margin = 0) {
  return (
    x >= -margin && x <= width + margin && y >= -margin && y <= height + margin
  );
}

// Performance utilities
export class FPSTracker {
  constructor(historySize = 60) {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    this.fpsHistorySize = historySize;
    this.currentFPS = 0;
  }

  update() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.fpsHistory.push(deltaTime);

    if (this.fpsHistory.length > this.fpsHistorySize) {
      this.fpsHistory.shift();
    }

    if (this.fpsHistory.length > 0) {
      const avgFrameTime =
        this.fpsHistory.reduce((sum, time) => sum + time, 0) /
        this.fpsHistory.length;
      this.currentFPS = 1000 / avgFrameTime;
    }

    this.frameCount++;
    return this.currentFPS;
  }
}

// Shadow calculation utilities
export function calculateShadowProperties(
  sprite,
  camera,
  baseSize,
  lightDirection = null
) {
  // Use a minimum effective height for shadow calculation, even if object is on ground
  const effectiveHeight = Math.max(1.0, sprite.y); // Minimum 1.0 unit height for shadows

  // Distance-based shadow intensity
  const distanceFromCamera = calculateDistance3D(
    sprite.x,
    sprite.y,
    sprite.z,
    camera.x,
    camera.y,
    camera.z
  );
  const distanceFactor = Math.min(distanceFromCamera / 30, 1);

  // Shadow alpha - make it more visible
  const shadowAlpha = Math.max(0.2, 0.2 - distanceFactor * 0.2);

  // Simple elliptical shadow - make it visible regardless of height
  const radiusX = baseSize * 1.2; // Horizontal radius
  const radiusY = baseSize * 0.6; // Vertical radius - always visible size

  // No offset - shadow is directly below the object
  const offsetX = 0;
  const offsetZ = 0;

  return {
    shadowAlpha,
    radiusX,
    radiusY,
    offsetX,
    offsetZ,
  };
}

export function calculateFocalLength(fov, width) {
  // Convert FOV from degrees to radians and calculate focal length
  const fovRadians = (fov * Math.PI) / 180;
  return width / 2 / Math.tan(fovRadians / 2);
}
