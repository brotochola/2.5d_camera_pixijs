import {
  calculateDistance3D,
  calculateShadowProperties,
  isValidProjection,
} from "./utils.js";
import { ALTITUDES } from "./Game.js";

class Object3D {
  constructor(
    x = 0,
    y = 0,
    z = 0,
    textureUrl = null,
    game,
    offsetX = 0,
    offsetY = 0
  ) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.game = game;
    this.id = Math.random().toString(36).substring(2, 15);
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
    this.marginToBeAboveTheGround = 0.01;

    this.velocity = {
      x: 0, // Math.random() * 0.05,
      y: 0,
      z: 0, //Math.random() * 0.05 - 0.025,
    };
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleZ = 1;

    this.color = 0xffffff;

    this.isSprite = false;
    this.container = new PIXI.Container();
    this.shadowGraphics = new PIXI.Graphics();
    this.game.app.stage.addChild(this.container);
    this.container.addChild(this.shadowGraphics);
    this.textureUrl = textureUrl;
    this.sprite = null;
    this.isTextureLoaded = false;
    this.isReady = true; // Will be set to false if we're loading a texture

    // If textureUrl is provided, create a sprite asynchronously
    if (textureUrl) {
      this.isSprite = true;
      this.isReady = false; // Object is not ready until texture loads
      this._loadTexture(textureUrl);
    }
  }

  async _loadTexture(textureUrl) {
    try {
      this.texture = PIXI.Texture.from(textureUrl);

      // Wait for texture to load if it's not already loaded
      if (!this.texture.baseTexture.valid) {
        await new Promise((resolve, reject) => {
          if (this.texture.baseTexture.resource) {
            this.texture.baseTexture.on("loaded", resolve);
            this.texture.baseTexture.on("error", reject);
          } else {
            // Fallback for immediate resolution if resource is already loaded
            resolve();
          }
        });
      }

      // Create sprite only after texture is loaded
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.x = this.offsetX;
      this.sprite.y = this.offsetY;
      this.container.addChild(this.sprite);
      this.sprite.anchor.set(0.5, 1); // Center the sprite
      this.isTextureLoaded = true;
      this.isReady = true;
    } catch (error) {
      console.error("Failed to load texture:", textureUrl, error);
      // Fallback to non-sprite mode
      this.isSprite = false;
      this.isReady = true;
    }
  }

  setPosition(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
  }

  updateGraphics(projected) {
    // console.log("updateGraphics");

    // Don't render if texture is still loading
    if (this.isSprite && !this.isReady) return;

    if (this.isSprite && projected && projected.z > 0) {
      const size = this.size * projected.scale;

      // Only render if size is reasonable (performance optimization)
      if (size < 0.5) {
        this.container.visible = false;
        return;
      }

      // Validate projected coordinates to prevent sprites stuck at 0,0
      if (
        !projected.isVisible ||
        !isFinite(projected.x) ||
        !isFinite(projected.y) ||
        projected.x < -1000 ||
        projected.x > 3000 ||
        projected.y < -1000 ||
        projected.y > 3000
      ) {
        this.container.visible = false;
        return;
      }

      // Update sprite position and scale if we have a sprite
      if (this.container) {
        this.container.x = projected.x;
        this.container.y = projected.y;
        // Optimized scaling calculation
        const scale = Math.max(0.1, size / 64); // Assuming texture is around 64px
        this.container.scale.set(scale);
        this.container.visible = true;
      }
    }
  }

  establishZindexFromDistanceToCamera(distance) {
    this.container.zIndex = 10000 / distance;
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.z += this.velocity.z;

    this.cell = this.game.ground.getCellAt(this.x, this.z);
    this.amIMoving = !this.isObjectInTheSamePositionAsPrev();
    this.groundLevel = this.game.ground.getYAt(this.x, this.z);
    // this.amIOccludedByGround = ALTITUDES ? this.isOccludedByGround(6) : false;

    if (this.y > this.groundLevel)
      this.y = this.groundLevel + this.marginToBeAboveTheGround;

    this.prev = {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  isObjectInTheSamePositionAsPrev() {
    if (!this.prev) return false;
    return (
      this.x == this.prev.x && this.y == this.prev.y && this.z == this.prev.z
    );
  }

  render() {
    // if (this.amIOccludedByGround) {
    //   this.visible = false;
    //   if (this.sprite) this.sprite.visible = false;
    //   return;
    // }
    this.iAintReRendering = !this.amIMoving && !this.game.camera.isCameraMoving;

    // Always update shadows when camera moves, regardless of object movement
    if (this.game.shadowsEnabled) this.renderShadow();

    if (this.iAintReRendering) return;

    this.getProjectedPosition();

    this.updateGraphics(this.projected);
  }
  getProjectedPosition() {
    this.projected = this.game.camera.project3D(this.x, this.y, this.z);
    if (!this.projected) {
      this.visible = false;
      this.container.visible = false;
      return;
    }
    this.visible = this.projected.isVisible;
    this.container.visible = this.visible;
    this.establishZindexFromDistanceToCamera(this.projected.z);
  }

  renderShadow() {
    // console.log("renderShadow");
    if (!this.projected) return;

    if (!this.isSprite || !this.isReady) return;
    this.shadowGraphics.clear();

    // Add size check back - we need this for performance
    const size = this.size * this.projected.scale;
    if (size < 0.1) return;

    // Calculate shadow height based on camera position
    const shadowHeight = this.calculateShadowHeight();

    this.shadowGraphics.beginFill(0x000000, 0.3); // Increased opacity for visibility
    this.shadowGraphics.drawEllipse(
      0,
      this.groundLevel - this.y,
      this.size * 500,
      shadowHeight
    );
    this.shadowGraphics.endFill();
  }

  /**
   * Calculate shadow height based on camera position and object height
   * @returns {number} The calculated shadow height
   */
  calculateShadowHeight() {
    // Ensure we have a valid size property
    if (!this.size) this.size = 1; // Default size if not set

    const cameraHeight = this.game.camera.y;
    const groundLevel = this.groundLevel || 0;

    // Simple approach: higher camera = taller shadow
    // Use a base shadow height and multiply by camera height factor
    const baseShadowHeight = this.size * 20;
    const heightFactor = Math.max(0.5, cameraHeight / Math.max(1, groundLevel));

    const finalHeight = baseShadowHeight * heightFactor;

    return finalHeight;
  }

  /**
   * Check if this object is occluded by any ground cells
   * @param {number} steps - Number of steps to sample along the line of sight (default: 15)
   * @returns {boolean} True if the object is occluded by ground, false otherwise
   */
  isOccludedByGround(steps = 15) {
    if (!this.game.camera || !this.game.ground) {
      return false;
    }

    const camera = this.game.camera;

    // Calculate vector from camera to object
    const dx = this.x - camera.x;
    const dy = this.y - camera.y;
    const dz = this.z - camera.z;

    // Calculate total distance
    const totalDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // If object is very close to camera, skip occlusion check
    if (totalDistance < 1) {
      return false;
    }

    // Calculate step size for sampling
    const stepSize = 1.0 / steps;

    // Sample points along the line from camera to object
    for (let i = 1; i < steps; i++) {
      // Start from 1 to skip camera position, end before object
      const t = i * stepSize;

      // Interpolate position along the line
      const sampleX = camera.x + dx * t;
      const sampleY = camera.y + dy * t;
      const sampleZ = camera.z + dz * t;

      // Get ground height at this x,z position
      const groundHeight = this.game.ground.getYAt(sampleX, sampleZ);

      // Check if ground is higher than the line of sight at this point
      // Add a small tolerance to avoid false positives from floating point precision
      const tolerance = 0.1;
      if (groundHeight > sampleY + tolerance) {
        return true; // Object is occluded by ground
      }
    }

    // Also check if the object itself is below ground level
    if (this.y < this.groundLevel) {
      return true;
    }

    return false; // No occlusion found
  }
}

export default Object3D;
