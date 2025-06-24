class Object3D {
  constructor(x = 0, y = 0, z = 0, textureUrl = null) {
    this.id = Math.random().toString(36).substring(2, 15);
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.scaleZ = 1;
    this.vertices = [];
    this.faces = [];
    this.color = 0xffffff;
    this.graphics = new PIXI.Graphics();
    this.needsUpdate = true;
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
      this.sprite.anchor.set(0.5, 1); // Center the sprite
      this.isTextureLoaded = true;
      this.isReady = true;
      this.needsUpdate = true; // Trigger a redraw
    } catch (error) {
      console.error("Failed to load texture:", textureUrl, error);
      // Fallback to non-sprite mode
      this.isSprite = false;
      this.isReady = true;
      this.needsUpdate = true;
    }
  }

  setPosition(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.needsUpdate = true;
  }

  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    this.needsUpdate = true;
  }

  updateGraphics(projected) {
    if (!this.needsUpdate && !this.isSprite) return;

    // Don't render if texture is still loading
    if (this.isSprite && !this.isReady) return;

    this.graphics.clear();

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
      } else {
        // Fallback to drawing a circle if no sprite
        this.graphics.beginFill(this.color);
        this.graphics.drawCircle(projected.x, projected.y, size);
        this.graphics.endFill();
      }
    }

    this.needsUpdate = false;
  }
}

export default Object3D;
