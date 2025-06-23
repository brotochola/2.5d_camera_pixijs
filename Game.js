import Camera from "./Camera.js";
import Renderer3D from "./Renderer3D.js";
import { createSprite3D, createGround } from "./utils.js";

class Game {
  constructor() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x87ceeb,
      antialias: true,
    });

    document.getElementById("gameContainer").appendChild(this.app.view);

    this.renderer3D = new Renderer3D(window.innerWidth, window.innerHeight);
    this.camera = new Camera(1, 2, 10);
    this.objects = [];
    this.groundSize = 30;
    this.darkenFactor = 0.7;

    this.setupDebugControls();
    this.createWorld();
    this.setupControls();
    this.setupGameLoop();
  }

  setupDebugControls() {
    // FOV Slider
    const fovSlider = document.getElementById("fov-slider");
    const fovValue = document.getElementById("fov-value");
    fovSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.camera.fov = value;
      fovValue.textContent = value;
    });

    // Max Distance Slider
    const maxDistanceSlider = document.getElementById("max-distance-slider");
    const maxDistanceValue = document.getElementById("max-distance-value");
    maxDistanceSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.renderer3D.maxDistanceToRender = value;
      maxDistanceValue.textContent = value;
    });

    // Margin Factor Slider
    const marginFactorSlider = document.getElementById("margin-factor-slider");
    const marginFactorValue = document.getElementById("margin-factor-value");
    marginFactorSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.renderer3D.marginFactor = value;
      marginFactorValue.textContent = value.toFixed(2);
    });

    // Darken Factor Slider
    const darkenFactorSlider = document.getElementById("darken-factor-slider");
    const darkenFactorValue = document.getElementById("darken-factor-value");
    darkenFactorSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.darkenFactor = value;
      darkenFactorValue.textContent = value.toFixed(2);
    });

    // Ground Size Slider
    const groundSizeSlider = document.getElementById("ground-size-slider");
    const groundSizeValue = document.getElementById("ground-size-value");
    groundSizeSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.groundSize = value;
      this.recreateGround();
      groundSizeValue.textContent = value;
    });
  }

  createWorld() {
    // Create ground and other objects
    this.ground = createGround(this.groundSize);
    this.objects.push(this.ground);
    this.app.stage.addChild(this.ground.graphics); // Add ground graphics first

    // Create 100 grass sprites at random positions with y=0
    const sprites = [];
    const grassCount = 200;
    const spawnRadius = this.groundSize * 1.5; // Spawn within ground area

    for (let i = 0; i < grassCount; i++) {
      // Random position within spawn radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * spawnRadius;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Random size variation for more natural look
      const size = 0.2;
      const sprite = createSprite3D(x, 0, z, size, 0x00ff00, "grass.png");
      sprites.push(sprite);

      this.objects.push(sprite);
      this.app.stage.addChild(sprite.shadowGraphics); // Add shadow first (render below sprite)

      // Add the actual PIXI sprite if it exists
      if (sprite.sprite) {
        this.app.stage.addChild(sprite.sprite);
      } else {
        // Fallback to graphics if no sprite
        this.app.stage.addChild(sprite.graphics);
      }
    }
  }

  recreateGround() {
    // Remove old ground
    const groundIndex = this.objects.indexOf(this.ground);
    if (groundIndex !== -1) {
      this.app.stage.removeChild(this.ground.graphics);
      this.objects.splice(groundIndex, 1);
    }

    // Create new ground
    this.ground = createGround(this.groundSize);
    this.objects.unshift(this.ground);
    this.app.stage.addChild(this.ground.graphics); // Don't forget to add graphics when recreating
  }

  setupControls() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseSensitivity = 0.001;

    // Eventos de teclado
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (this.keys["KeyI"] && !this.camera.transitioning)
        this.camera.isometricView();
      if (this.keys["KeyO"] && !this.camera.transitioning)
        this.camera.normalView();
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Eventos de ratón - Corregido
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === this.app.view) {
        console.log("Mouse bloqueado");
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === this.app.view) {
        this.camera.rotate(
          -e.movementX * this.mouseSensitivity,
          e.movementY * this.mouseSensitivity
        );
      }
    });

    // Clic para bloquear mouse
    this.app.view.addEventListener("click", () => {
      if (document.pointerLockElement !== this.app.view) {
        this.app.view.requestPointerLock();
      } else {
        this.shoot();
      }
    });

    // Prevenir menú contextual
    this.app.view.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  shoot() {
    // Crear efecto de disparo
    const muzzleFlash = new PIXI.Graphics();
    muzzleFlash.beginFill(0xffff00);
    muzzleFlash.drawCircle(
      this.app.screen.width / 2,
      this.app.screen.height / 2,
      10
    );
    muzzleFlash.endFill();
    this.app.stage.addChild(muzzleFlash);

    setTimeout(() => {
      this.app.stage.removeChild(muzzleFlash);
    }, 100);
  }

  whoIsTHeCameraAimingTo() {
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;
    let closestObject = null;
    let closestDistance = Infinity;

    for (const obj of this.objects) {
      if (!obj.isSprite) continue; // Skip non-sprite objects

      let bounds;
      if (obj.sprite) {
        bounds = obj.sprite.getBounds();
      } else {
        bounds = obj.graphics.getBounds();
      }

      // Check if center of screen is within the sprite bounds
      if (
        centerX >= bounds.left &&
        centerX <= bounds.right &&
        centerY >= bounds.top &&
        centerY <= bounds.bottom
      ) {
        return obj;
      }
    }

    return null;
  }

  handleInput() {
    const speed = 0.1;

    if (this.keys["KeyW"]) this.camera.move(0, 0, speed); // Corregido: W avanza
    if (this.keys["KeyS"]) this.camera.move(0, 0, -speed); // Corregido: S retrocede
    if (this.keys["KeyA"]) this.camera.move(-speed, 0, 0);
    if (this.keys["KeyD"]) this.camera.move(speed, 0, 0);
    if (this.keys["Space"]) this.camera.move(0, speed, 0);
    if (this.keys["ShiftLeft"]) this.camera.move(0, -speed, 0);
  }

  update() {
    for (const obj of this.objects.filter((k) => k.isSprite)) {
      // Update positions with movement
      //   const randomSign = Math.random() > 0.5 ? -1 : 1;
      //   obj.y += Math.cos(performance.now() / 1000) * 0.04;

      //-------------
      // Ground collision check
      const groundLevel = 0;
      const objectRadius = obj.size;

      //   if (obj.y - objectRadius < groundLevel) {
      //     // Place object exactly at ground level plus radius
      //     obj.y = groundLevel + objectRadius;
      //   }
    }
  }

  render() {
    this.renderer3D.clearZBuffer();

    // Separate ground from other objects
    const ground = this.objects.find((obj) => !obj.isSprite);
    const sprites = this.objects.filter((obj) => obj.isSprite);

    // Render ground first
    if (ground) {
      this.renderObject(ground);
    }

    // Calculate distances and filter visible sprites for performance
    const visibleSprites = [];
    const maxRenderDistance = this.renderer3D.maxDistanceToRender;

    for (const obj of sprites) {
      const dx = obj.x - this.camera.x;
      const dy = obj.y - this.camera.y;
      const dz = obj.z - this.camera.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Only render sprites within distance and potentially visible
      if (distance < maxRenderDistance) {
        visibleSprites.push({ obj, distance });
      } else {
        // Hide sprites that are too far
        if (obj.sprite) {
          obj.sprite.visible = false;
        }
        obj.shadowGraphics.visible = false;
      }
    }

    // Sort visible sprites by distance (farthest first)
    visibleSprites.sort((a, b) => b.distance - a.distance);

    // Update sprite positions in stage based on z-order
    for (const { obj } of visibleSprites) {
      // Make sure sprites are visible
      if (obj.sprite) {
        obj.sprite.visible = true;
        this.app.stage.removeChild(obj.sprite);
        this.app.stage.addChild(obj.sprite);
      } else {
        this.app.stage.removeChild(obj.graphics);
        this.app.stage.addChild(obj.graphics);
      }
      obj.shadowGraphics.visible = true;
      this.renderObject(obj);
    }

    this.camera.update();
    // Actualizar UI
    this.updateUI();
  }

  renderObject(obj) {
    if (obj.isSprite) {
      this.renderSprite(obj);
    } else {
      this.renderMesh(obj);
    }
  }

  renderSprite(sprite) {
    const projected = this.renderer3D.project3D(
      sprite.x,
      sprite.y,
      sprite.z,
      this.camera
    );
    sprite.renderer3D = this.renderer3D;
    sprite.camera = this.camera;
    sprite.updateGraphics(projected);
  }

  renderMesh(obj) {
    const projectedVertices = [];

    for (const vertex of obj.vertices) {
      const worldX = vertex[0] + obj.x;
      const worldY = vertex[1] + obj.y;
      const worldZ = vertex[2] + obj.z;

      const projected = this.renderer3D.project3D(
        worldX,
        worldY,
        worldZ,
        this.camera
      );
      projectedVertices.push(projected);
    }

    obj.graphics.clear();
    this.numberOfVisibleFaces = 0;

    for (const face of obj.faces) {
      const faceVertices = face
        .map((i) => projectedVertices[i])
        .filter((v) => v !== null);

      if (faceVertices.length >= 3 && faceVertices.some((v) => v.isVisible)) {
        this.numberOfVisibleFaces++;
        const avgZ =
          faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;

        const maxDistance = this.renderer3D.maxDistanceToRender * 0.9;
        const minDistance = 5;
        const distanceFactor = Math.min(
          Math.max((avgZ - minDistance) / (maxDistance - minDistance), 0),
          1
        );

        if (avgZ > this.renderer3D.maxDistanceToRender) {
          continue;
        }

        const r = (obj.color >> 16) & 0xff;
        const g = (obj.color >> 8) & 0xff;
        const b = obj.color & 0xff;

        // Use the darkenFactor from the slider
        const darkFactor = 1 - distanceFactor * this.darkenFactor;
        const newR = Math.floor(r * darkFactor);
        const newG = Math.floor(g * darkFactor);
        const newB = Math.floor(b * darkFactor);

        const shadedColor = (newR << 16) | (newG << 8) | newB;

        obj.graphics.beginFill(shadedColor);
        obj.graphics.moveTo(faceVertices[0].x, faceVertices[0].y);

        for (let i = 1; i < faceVertices.length; i++) {
          obj.graphics.lineTo(faceVertices[i].x, faceVertices[i].y);
        }

        obj.graphics.closePath();
        obj.graphics.endFill();

        obj.graphics.lineStyle(1, 0x000000, 0.1);
        obj.graphics.moveTo(faceVertices[0].x, faceVertices[0].y);
        for (let i = 1; i < faceVertices.length; i++) {
          obj.graphics.lineTo(faceVertices[i].x, faceVertices[i].y);
        }
        obj.graphics.closePath();
        obj.graphics.lineStyle(0);
      }
    }
    obj.ratioOfVisibleFaces = this.numberOfVisibleFaces / obj.faces.length;
  }

  updateUI() {
    const coords = document.getElementById("coords");
    coords.textContent = `Pos: (${this.camera.x.toFixed(
      1
    )}, ${this.camera.y.toFixed(1)}, ${this.camera.z.toFixed(1)}) | Rot: ${(
      (this.camera.rotationY * 180) /
      Math.PI
    ).toFixed(0)}°`;
  }

  setupGameLoop() {
    this.app.ticker.add(() => {
      this.handleInput();
      this.update();
      this.render();
    });
  }
}

export default Game;
