class Renderer3D {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.zBuffer = new Array(width * height);
    this.maxDistanceToRender = 110;
    this.marginFactor = 0.2;
  }

  calculateFocalLength(fov) {
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

  project3D(x, y, z, camera) {
    this.focalLength = this.calculateFocalLength(camera.fov);
    // Transformar coordenadas relativas a la cámara
    const dx = x - camera.x;
    const dy = y - camera.y;
    const dz = z - camera.z;

    // Aplicar rotación de la cámara
    const cosY = Math.cos(-camera.rotationY);
    const sinY = Math.sin(-camera.rotationY);
    const cosTilt = Math.cos(-camera.tilt);
    const sinTilt = Math.sin(-camera.tilt);

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
}

export default Renderer3D;
