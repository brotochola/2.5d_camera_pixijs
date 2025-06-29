import { ultraFastSin, ultraFastCos } from "./FastTrigonometry.js";
import { calculateFocalLength, calculateDistance3D } from "./utils.js";

class Camera {
  constructor(
    x = 0,
    y = 0,
    z = 0,
    width = window.innerWidth,
    height = window.innerHeight,
    game
  ) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationY = 3; // Rotación horizontal
    this.tilt = 0; // Rotación vertical
    this.fov = 80; // Campo de visión
    // this.near = 0.1;
    // this.far = 90;

    // Rendering properties (moved from Renderer3D)
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    // this.zBuffer = new Array(width * height);
    this.maxDistanceToRender = 110;
    this.marginFactor = 0.2;
  }

  // Update screen dimensions (for window resize)
  updateScreenSize(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    // this.zBuffer = new Array(width * height);
  }

  updateFocalLength(fov = this.fov) {
    if (this.focalLength && fov == this.fov) return this.focalLength;

    // Convert FOV from degrees to radians and calculate focal length
    this.fov = fov;
    this.focalLength = calculateFocalLength(fov, this.width);
  }

  calculateScreenMargin() {
    // Calculate margin based on screen dimensions and focal length
    // We want the margin to be proportional to the screen size
    // but also consider the focal length to account for FOV
    const baseMargin = Math.min(this.width, this.height) * this.marginFactor; // 20% of smaller screen dimension
    return baseMargin;
  }

  project3D(x, y, z) {
    this.updateFocalLength();
    // Transformar coordenadas relativas a la cámara
    const dx = x - this.x;
    const dy = y - this.y;
    const dz = z - this.z;

    // Aplicar rotación de la cámara - using ultra-fast lookup
    const cosY = ultraFastCos(-this.rotationY);
    const sinY = ultraFastSin(-this.rotationY);
    const cosTilt = ultraFastCos(-this.tilt);
    const sinTilt = ultraFastSin(-this.tilt);

    // Rotación Y (horizontal)
    const x1 = dx * cosY - dz * sinY;
    const z1 = dx * sinY + dz * cosY;
    const y1 = dy;

    // Rotación X (tilt)
    const y2 = y1 * cosTilt - z1 * sinTilt;
    const z2 = y1 * sinTilt + z1 * cosTilt;
    const x2 = x1;

    // Proyección perspectiva
    if (z2 < 0.01) return null; // Minimum distance from camera

    // Calculate focal length based on camera's FOV
    const scale = this.focalLength / z2;
    const screenX = this.centerX + x2 * scale;
    const screenY = this.centerY - y2 * scale;

    return {
      x: screenX,
      y: screenY,
      z: z2,
      scale: scale,
      isVisible:
        this.isObjectVisibleByAngle(screenX, screenY) &&
        this.isObjectVisibleByDistance({ x, y, z }),
    };
  }

  isObjectVisibleByAngle(screenX, screenY) {
    const margin = this.calculateScreenMargin();

    // Check if point is within screen bounds with dynamic margin
    return (
      screenX >= -margin &&
      screenX <= this.width + margin &&
      screenY >= -margin &&
      screenY <= this.height + margin
    );
  }

  // clearZBuffer() {
  //   this.zBuffer.fill(Infinity);
  // }

  transitionToNewPosition(x, y, z, tilt, rotationY, fov) {
    this.targetX = x;
    this.targetY = y;
    this.targetZ = z;
    this.targetTilt = tilt;
    this.targetRotationY = rotationY;
    this.targetFov = fov;
    this.transitioning = true;
  }

  move(dx, dy, dz) {
    // Movimiento relativo a la rotación de la cámara - using ultra-fast lookup
    const cos = ultraFastCos(this.rotationY);
    const sin = ultraFastSin(this.rotationY);

    this.x += dx * cos - dz * sin;
    this.z += dx * sin + dz * cos;
    this.y += dy;
    this.stopTransitioning();
  }

  stopTransitioning() {
    this.transitioning = false;
    this.targetX = null;
    this.targetY = null;
    this.targetZ = null;
    this.targetTilt = null;
    this.targetRotationY = null;
    this.targetFov = null;
  }

  rotate(deltaY, deltaTilt) {
    this.stopTransitioning();

    this.rotationY += deltaY;
    this.tilt += deltaTilt;

    // Limitar el tilt para evitar que se voltee completamente
    this.tilt = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, this.tilt)
    );
  }

  getViewMatrix() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      rotationY: this.rotationY,
      tilt: this.tilt,
    };
  }

  update() {
    if (
      this.targetX !== null &&
      this.targetX !== undefined &&
      this.transitioning
    ) {
      const lerpFactor = 0.05;
      this.x += (this.targetX - this.x) * lerpFactor;
      this.y += (this.targetY - this.y) * lerpFactor;
      this.z += (this.targetZ - this.z) * lerpFactor;
      this.tilt += (this.targetTilt - this.tilt) * lerpFactor;
      this.rotationY += (this.targetRotationY - this.rotationY) * lerpFactor;
      this.fov += (this.targetFov - this.fov) * lerpFactor;
      if (
        Math.sqrt(
          Math.pow(this.x - this.targetX, 2) +
            Math.pow(this.y - this.targetY, 2) +
            Math.pow(this.z - this.targetZ, 2)
        ) < 5
      ) {
        if (
          Math.abs(this.tilt - this.targetTilt) < 0.01 &&
          Math.abs(this.rotationY - this.targetRotationY) < 0.01 &&
          Math.abs(this.fov - this.targetFov) < 0.01
        ) {
          this.transitioning = false;
        }
      }
    }

    // this.keepCameraOnTHeGround();
    this.isCameraMoving = !this.isCameraInTheSamePositionAsPrev();

    this.prev = {
      x: this.x,
      y: this.y,
      z: this.z,
      tilt: this.tilt,
      rotationY: this.rotationY,
      fov: this.fov,
      focalLength: this.focalLength,
    };
  }

  keepCameraOnTHeGround() {
    this.groundLevel = this.game.ground.getYAt(this.x, this.z);

    if (this.y > this.groundLevel) this.y = this.groundLevel + 4;
  }
  isCameraInTheSamePositionAsPrev() {
    if (!this.prev) return false;
    return (
      this.x == this.prev.x &&
      this.y == this.prev.y &&
      this.z == this.prev.z &&
      this.tilt == this.prev.tilt &&
      this.rotationY == this.prev.rotationY &&
      this.fov == this.prev.fov &&
      this.focalLength == this.prev.focalLength
    );
  }

  isometricView() {
    this.transitionToNewPosition(34, 63, 41, 0.76, 2.36, 40);
  }

  normalView() {
    this.transitionToNewPosition(10, 6, 33, 0, 3, 50);
  }

  // Visibility and filtering methods

  // Check if an object is visible based on distance from camera
  isObjectVisibleByDistance(obj) {
    const distance = calculateDistance3D(
      obj.x,
      obj.y,
      obj.z,
      this.x,
      this.y,
      this.z
    );

    return distance < this.maxDistanceToRender;
  }

  filterObjectsByDistance(sprites) {
    const visibleSprites = [];
    const maxRenderDistance = this.maxDistanceToRender;

    for (const obj of sprites) {
      const distance = calculateDistance3D(
        obj.x,
        obj.y,
        obj.z,
        this.x,
        this.y,
        this.z
      );

      if (distance < maxRenderDistance) {
        visibleSprites.push({ obj, distance });
      } else {
        // Hide sprites that are too far
        if (obj.sprite) {
          obj.sprite.visible = false;
        }
      }
    }

    // Sort by distance (farthest first for proper z-ordering)
    visibleSprites.sort((a, b) => b.distance - a.distance);
    return visibleSprites;
  }

  getBoundingBox(obj, projected) {
    if (!projected || !projected.isVisible) return null;

    const size = obj.size * projected.scale;

    return {
      left: projected.x - size / 2,
      right: projected.x + size / 2,
      top: projected.y - size,
      bottom: projected.y,
      centerX: projected.x,
      centerY: projected.y - size / 2,
      size: size,
    };
  }

  boundingBoxesOverlap(box1, box2) {
    return !(
      box1.right < box2.left ||
      box1.left > box2.right ||
      box1.bottom < box2.top ||
      box1.top > box2.bottom
    );
  }

  isOccluded(obj, objDistance, allVisibleSprites) {
    // Get the projected position of the object to test
    const projected = this.project3D(obj.x, obj.y, obj.z);
    if (!projected || !projected.isVisible) return true;

    const objBounds = this.getBoundingBox(obj, projected);
    if (!objBounds) return true;

    // Check against all closer objects
    for (const {
      obj: otherObj,
      distance: otherDistance,
    } of allVisibleSprites) {
      // Skip self and objects that are farther away
      if (otherObj === obj || otherDistance >= objDistance) continue;

      // Only check sprites for occlusion
      if (!otherObj.isSprite) continue;

      const otherProjected = this.project3D(otherObj.x, otherObj.y, otherObj.z);
      if (!otherProjected || !otherProjected.isVisible) continue;

      const otherBounds = this.getBoundingBox(otherObj, otherProjected);
      if (!otherBounds) continue;

      // Check if bounding boxes overlap
      if (this.boundingBoxesOverlap(objBounds, otherBounds)) {
        // Additional checks for better occlusion detection
        const distanceDiff = objDistance - otherDistance;
        const sizeRatio = otherBounds.size / objBounds.size;

        // If the closer object is significantly larger and closer, it occludes
        if (distanceDiff > 1.0 && sizeRatio > 0.7) {
          return true;
        }

        // If objects are very close in distance, check if one completely covers the other
        if (distanceDiff > 0.5) {
          const centerDistance = Math.sqrt(
            Math.pow(objBounds.centerX - otherBounds.centerX, 2) +
              Math.pow(objBounds.centerY - otherBounds.centerY, 2)
          );

          // If the closer object's center is close and it's larger, it occludes
          if (centerDistance < otherBounds.size / 2 && sizeRatio > 0.8) {
            return true;
          }
        }
      }
    }

    return false;
  }

  applyOcclusionCulling(visibleSprites) {
    const culledSprites = [];

    for (const spriteData of visibleSprites) {
      const { obj, distance } = spriteData;

      // Skip occlusion testing for non-sprites
      if (!obj.isSprite) {
        culledSprites.push(spriteData);
        continue;
      }

      // Test if this object is occluded by any closer object
      if (!this.isOccluded(obj, distance, visibleSprites)) {
        culledSprites.push(spriteData);
      } else {
        // Mark occluded sprites as hidden
        if (obj.sprite) {
          obj.sprite.visible = false;
        }
      }
    }

    return culledSprites;
  }

  // Master visibility filtering method that combines distance, frustum, and occlusion culling
  getVisibleObjects(objects, enableOcclusionCulling = true) {
    // Step 1: Filter by distance and sort by z-order
    const distanceFiltered = this.filterObjectsByDistance(objects);

    // Step 2: The project3D method already handles frustum culling (screen margin)
    // through the isVisible property, so objects are automatically filtered by angle/frustum

    // Step 3: Apply occlusion culling if enabled
    const finalVisible = enableOcclusionCulling
      ? this.applyOcclusionCulling(distanceFiltered)
      : distanceFiltered;

    return finalVisible;
  }
}

export default Camera;
