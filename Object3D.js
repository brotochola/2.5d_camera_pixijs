import { calculateShadowProperties, isValidProjection } from "./utils.js";
import { ALTITUDES } from "./Game.js";

class Object3D {
  constructor(x = 0, y = 0, z = 0, textureUrl = null, game) {
    this.game = game;
    this.id = Math.random().toString(36).substring(2, 15);
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
    this.velocity = {
      x: 0, //Math.random() * 0.1,
      y: 0,
      z: 0, //Math.random() * 0.1 - 0.05,
    };
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleZ = 1;

    this.color = 0xffffff;
    // this.graphics = new PIXI.Graphics();

    this.isSprite = false;
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
      this.game.app.stage.addChild(this.sprite);
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

    // this.graphics.clear();

    if (this.isSprite && projected && projected.z > 0) {
      const size = this.size * projected.scale;

      // Only render if size is reasonable (performance optimization)
      if (size < 0.5) {
        if (this.sprite) this.sprite.visible = false;
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
        if (this.sprite) this.sprite.visible = false;
        return;
      }

      // Update sprite position and scale if we have a sprite
      if (this.sprite) {
        this.sprite.x = projected.x;
        this.sprite.y = projected.y;
        // Optimized scaling calculation
        const scale = Math.max(0.1, size / 64); // Assuming texture is around 64px
        this.sprite.scale.set(scale);
        this.sprite.visible = true;
      }
    }
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.z += this.velocity.z;

    this.amIMoving = !this.isObjectInTheSamePositionAsPrev();
    this.groundLevel = this.game.ground.getYAt(this.x, this.z);
    this.amIOccludedByGround = ALTITUDES ? this.isOccludedByGround(15) : false;

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
    if (this.amIOccludedByGround) {
      this.visible = false;
      if (this.sprite) this.sprite.visible = false;
      return;
    }
    this.iAintReRendering = !this.amIMoving && !this.game.camera.isCameraMoving;

    if (this.game.shadowsEnabled) this.renderShadow();
    if (this.iAintReRendering) return;

    this.getProjectedPosition();

    this.updateGraphics(this.projected);
  }
  getProjectedPosition() {
    this.projected = this.game.camera.project3D(this.x, this.y, this.z);
    if (!this.projected) {
      this.visible = false;
      if (this.sprite) this.sprite.visible = false;
      return;
    }
    this.visible = this.projected.isVisible;
    if (this.sprite) this.sprite.visible = this.visible;
  }

  renderShadow() {
    // console.log("renderShadow");
    if (!this.projected) return;

    if (!this.isSprite || !this.isReady) return;

    const size = this.size * this.projected.scale;
    if (size < 0.1) return; // Less restrictive size check

    // Calculate shadow properties
    const baseShadowSize = size * 0.8; // Bigger base shadow size
    const shadowProps = calculateShadowProperties(
      this,
      this.game.camera,
      baseShadowSize
    );

    // Shadow is directly below the object at ground level (y=0)
    const shadowProjected = this.game.camera.project3D(
      this.x, // Same X as object
      this.groundLevel, // Ground level
      this.z // Same Z as object
    );

    if (
      shadowProjected &&
      shadowProjected.scale > 0 &&
      shadowProjected.isVisible
    ) {
      if (
        isFinite(shadowProjected.x) &&
        isFinite(shadowProjected.y) &&
        shadowProps.radiusX > 0 &&
        shadowProps.radiusY > 0
      ) {
        try {
          this.game.shadowGraphics.beginFill(0x000000, shadowProps.shadowAlpha);
          this.game.shadowGraphics.drawEllipse(
            shadowProjected.x,
            shadowProjected.y,
            shadowProps.radiusX,
            shadowProps.radiusY
          );
          this.game.shadowGraphics.endFill();
        } catch (error) {
          console.warn("Shadow drawing error:", error);
        }
      }
    }
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
    const objectGroundHeight = this.game.ground.getYAt(this.x, this.z);
    if (this.y < objectGroundHeight) {
      return true;
    }

    return false; // No occlusion found
  }
}

export default Object3D;
