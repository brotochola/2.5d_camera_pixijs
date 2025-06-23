class Camera {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotationY = 3; // Rotación horizontal
    this.tilt = 0; // Rotación vertical
    this.fov = 80; // Campo de visión
    this.near = 0.1;
    this.far = 90;
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
