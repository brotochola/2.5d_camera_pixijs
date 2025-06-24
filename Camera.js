class Camera {
  constructor(
    x = 0,
    y = 0,
    z = 0,
    width = window.innerWidth,
    height = window.innerHeight
  ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationY = 3; // Rotación horizontal
    this.tilt = 0; // Rotación vertical
    this.fov = 80; // Campo de visión
    this.near = 0.1;
    this.far = 90;

    // Rendering properties (moved from Renderer3D)
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.zBuffer = new Array(width * height);
    this.maxDistanceToRender = 110;
    this.marginFactor = 0.2;
  }

  // Update screen dimensions (for window resize)
  updateScreenSize(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.zBuffer = new Array(width * height);
  }

  calculateFocalLength(fov = this.fov) {
    // Convert FOV from degrees to radians and calculate focal length
    const fovRadians = (fov * Math.PI) / 180;
    return this.width / 2 / Math.tan(fovRadians / 2);
  }

  calculateScreenMargin() {
    // Calculate margin based on screen dimensions and focal length
    // We want the margin to be proportional to the screen size
    // but also consider the focal length to account for FOV
    const baseMargin = Math.min(this.width, this.height) * this.marginFactor; // 20% of smaller screen dimension
    return baseMargin;
  }

  project3D(x, y, z) {
    this.focalLength = this.calculateFocalLength(this.fov);
    // Transformar coordenadas relativas a la cámara
    const dx = x - this.x;
    const dy = y - this.y;
    const dz = z - this.z;

    // Aplicar rotación de la cámara
    const cosY = Math.cos(-this.rotationY);
    const sinY = Math.sin(-this.rotationY);
    const cosTilt = Math.cos(-this.tilt);
    const sinTilt = Math.sin(-this.tilt);

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

    const margin = this.calculateScreenMargin();

    // Check if point is within screen bounds with dynamic margin
    const isVisible =
      screenX >= -margin &&
      screenX <= this.width + margin &&
      screenY >= -margin &&
      screenY <= this.height + margin;

    return {
      x: screenX,
      y: screenY,
      z: z2,
      scale: scale,
      isVisible: isVisible,
    };
  }

  clearZBuffer() {
    this.zBuffer.fill(Infinity);
  }

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
    // Movimiento relativo a la rotación de la cámara
    const cos = Math.cos(this.rotationY);
    const sin = Math.sin(this.rotationY);

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
  }

  isometricView() {
    this.transitionToNewPosition(34, 63, 41, 0.76, 2.36, 40);
  }

  normalView() {
    this.transitionToNewPosition(10, 6, 33, 0, 3, 50);
  }
}

export default Camera;
