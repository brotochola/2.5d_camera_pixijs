import Camera from "./Camera.js";
import Ground from "./Ground.js";
import {
  createSprite3D,
  FPSTracker,
  calculateShadedColor,
  calculateDistanceFactor,
  isValidProjection,
  calculateShadowProperties,
  calculateDistance3D,
} from "./utils.js";
import { ultraFastSin, ultraFastCos } from "./FastTrigonometry.js";

export const ALTITUDES = true;

class Game {
  constructor() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x87ceeb,
      antialias: true,
    });

    window.__PIXI_APP__ = this.app;

    document.getElementById("gameContainer").appendChild(this.app.view);

    this.camera = new Camera(1, 2, 10, window.innerWidth, window.innerHeight);
    this.objects = [];
    this.groundSize = 30;
    this.meshDensity = 2.2;
    this.darkenFactor = 0.7;
    this.occlusionCullingEnabled = true;
    this.shadowsEnabled = true;

    // Object visibility tracking
    this.numberOfVisibleObjects = 0;
    this.ratioOfVisibleObjects = 0;

    // Use FPSTracker utility
    this.fpsTracker = new FPSTracker(60);

    // Create shared shadow graphics
    this.shadowGraphics = new PIXI.Graphics();
    this.app.stage.addChild(this.shadowGraphics);

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
      this.camera.updateFocalLength(value);
      fovValue.textContent = value;
    });

    // Max Distance Slider
    const maxDistanceSlider = document.getElementById("max-distance-slider");
    const maxDistanceValue = document.getElementById("max-distance-value");
    maxDistanceSlider.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      this.camera.maxDistanceToRender = value;
      maxDistanceValue.textContent = value;
    });

    // Margin Factor Slider
    const marginFactorSlider = document.getElementById("margin-factor-slider");
    const marginFactorValue = document.getElementById("margin-factor-value");
    marginFactorSlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.camera.marginFactor = value;
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

    // Mesh Density Slider
    const meshDensitySlider = document.getElementById("mesh-density-slider");
    const meshDensityValue = document.getElementById("mesh-density-value");
    meshDensitySlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      this.meshDensity = value;
      this.recreateGround();
      meshDensityValue.textContent = value;
    });

    // Occlusion Culling Checkbox
    const occlusionCullingCheckbox = document.getElementById(
      "occlusion-culling-checkbox"
    );
    occlusionCullingCheckbox.addEventListener("change", (e) => {
      this.occlusionCullingEnabled = e.target.checked;
      console.log(
        "Occlusion Culling",
        this.occlusionCullingEnabled ? "enabled" : "disabled"
      );
    });

    // Shadows Checkbox
    const shadowsCheckbox = document.getElementById("shadows-checkbox");
    shadowsCheckbox.addEventListener("change", (e) => {
      this.shadowsEnabled = e.target.checked;
      console.log("Shadows", this.shadowsEnabled ? "enabled" : "disabled");
    });
  }

  createWorld() {
    // Create ground and other objects
    this.ground = new Ground(this.groundSize, this.meshDensity);
    // this.objects.push(this.ground);
    this.app.stage.addChild(this.ground.graphics);

    // Create 200 grass sprites at random positions with y=0
    const sprites = [];
    const grassCount = 100;
    const spawnRadius = this.groundSize * 1.5;

    for (let i = 0; i < grassCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * spawnRadius;
      const x = ultraFastCos(angle) * distance;
      const z = ultraFastSin(angle) * distance;

      const y = this.ground.getYAt(x, z);

      // Ensure we don't place sprites too close to camera starting position
      const distanceFromCamera = calculateDistance3D(x, y, z, 1, 2, 10);
      if (distanceFromCamera < 2) {
        i--;
        continue;
      }

      const size = 0.2;
      const sprite = createSprite3D(x, y, z, size, 0x00ff00, "grass.png", this);
      sprites.push(sprite);
      this.objects.push(sprite);
    }
  }

  recreateGround() {
    // Create new ground
    // this.ground.destroy();
    this.ground.regenerate(this.groundSize, this.meshDensity);
    // this.objects.unshift(this.ground);
    this.app.stage.addChild(this.ground.graphics);
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
      if (this.keys["KeyH"]) {
        this.shadowsEnabled = !this.shadowsEnabled;
        console.log("Shadows", this.shadowsEnabled ? "enabled" : "disabled");
      }
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
    this.app.view.addEventListener("click", (e) => {
      if (document.pointerLockElement !== this.app.view) {
        this.app.view.requestPointerLock();
      } else {
        // this.shoot();
        console.log("click", e, this.whoIsTHeCameraAimingTo());
      }
    });

    // Prevenir menú contextual
    this.app.view.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  // shoot() {
  //   // Create shooting effect
  //   const muzzleFlash = new PIXI.Graphics();
  //   muzzleFlash.beginFill(0xffff00);
  //   muzzleFlash.drawCircle(
  //     this.app.screen.width / 2,
  //     this.app.screen.height / 2,
  //     10
  //   );
  //   muzzleFlash.endFill();
  //   this.app.stage.addChild(muzzleFlash);

  //   setTimeout(() => {
  //     this.app.stage.removeChild(muzzleFlash);
  //   }, 100);
  // }

  whoIsTHeCameraAimingTo() {
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;

    for (const obj of this.objects) {
      if (!obj.isSprite) continue;

      let bounds;
      if (obj.sprite) {
        bounds = obj.sprite.getBounds();
      } else {
        bounds = obj.graphics.getBounds();
      }

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

    if (this.keys["KeyW"]) this.camera.move(0, 0, speed);
    if (this.keys["KeyS"]) this.camera.move(0, 0, -speed);
    if (this.keys["KeyA"]) this.camera.move(-speed, 0, 0);
    if (this.keys["KeyD"]) this.camera.move(speed, 0, 0);
    if (this.keys["Space"]) this.camera.move(0, speed, 0);
    if (this.keys["ShiftLeft"]) this.camera.move(0, -speed, 0);
  }

  update() {
    for (let obj of this.objects) {
      obj.update();
    }
  }

  render() {
    // this.camera.clearZBuffer();

    // Only clear shadow graphics if shadows are enabled

    this.shadowGraphics.clear();

    // Separate ground from sprites

    // Render ground first

    this.ground.render(this.camera, this.darkenFactor);

    // Use camera's unified visibility filtering method
    // const objectsToRender = this.camera.getVisibleObjects(
    //   this.objects,
    //   this.occlusionCullingEnabled
    // );

    // Ensure shadows are positioned above ground but below sprites
    this.app.stage.removeChild(this.shadowGraphics);
    this.app.stage.addChild(this.shadowGraphics);
    let visibleObjects = 0;
    // Update sprite positions in stage based on z-order
    for (const obj of this.objects) {
      if (obj.sprite) {
        this.app.stage.removeChild(obj.sprite);
        this.app.stage.addChild(obj.sprite);
      }

      obj.render();
      if (obj.projected && obj.projected.isVisible) visibleObjects++;
    }

    // // Calculate visibility stats including occlusion culling

    this.numberOfVisibleObjects = this.objects.length;
    this.ratioOfVisibleObjects = visibleObjects / this.objects.length;

    // // Calculate occluded objects by getting distance-filtered count and subtracting final count
    // const distanceFilteredSprites =
    //   this.camera.filterObjectsByDistance(sprites);
    // this.numberOfOccludedObjects = this.occlusionCullingEnabled
    //   ? distanceFilteredSprites.length - culledSprites.length
    //   : 0;

    this.camera.update();
    this.updateUI();
  }

  updateUI() {
    const coords = document.getElementById("coords");
    const occlusionText = this.occlusionCullingEnabled
      ? ` | Occluded: ${this.numberOfOccludedObjects || 0}`
      : "";

    coords.textContent = `Pos: (${this.camera.x.toFixed(
      1
    )}, ${this.camera.y.toFixed(1)}, ${this.camera.z.toFixed(1)}) | Rot: ${(
      (this.camera.rotationY * 180) /
      Math.PI
    ).toFixed(0)}° | Visible Objects: ${this.numberOfVisibleObjects}/${
      this.objects.length
    } (${(this.ratioOfVisibleObjects * 100).toFixed(
      1
    )}%)${occlusionText} | FPS: ${this.fpsTracker.currentFPS.toFixed(0)}`;
  }

  gameloop() {
    this.fpsTracker.update();
    this.handleInput();
    this.update();
    this.render();
  }

  setupGameLoop() {
    this.app.ticker.add(this.gameloop.bind(this));
  }
}

export default Game;
