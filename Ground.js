import Object3D from "./Object3D.js";

class Ground extends Object3D {
  constructor(size = 20) {
    super(0, 0, 0); // Ground is at origin
    this.color = 0x99ff99;
    this.size = size;
    this.numberOfVisibleFaces = 0;
    this.ratioOfVisibleFaces = 0;
    this.generateGroundMesh(size);
  }

  generateGroundMesh(size) {
    this.vertices = [];
    this.faces = [];

    // Crear grid del piso con más densidad cerca de la cámara
    const step = 2;
    for (let x = -size * 2; x <= size * 2; x += step) {
      // Extended size
      for (let z = -size * 2; z <= size * 2; z += step) {
        // Extended size
        const baseIndex = this.vertices.length;
        const y = 0;
        this.vertices.push(
          [x, y, z],
          [x + step, y, z],
          [x + step, y, z + step],
          [x, y, z + step]
        );
        this.faces.push([
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex + 3,
        ]);
      }
    }
  }

  render(camera, darkenFactor = 0.7) {
    const projectedVertices = [];

    for (const vertex of this.vertices) {
      const worldX = vertex[0] + this.x;
      const worldY = vertex[1] + this.y;
      const worldZ = vertex[2] + this.z;

      const projected = camera.project3D(worldX, worldY, worldZ);
      projectedVertices.push(projected);
    }

    this.graphics.clear();
    this.numberOfVisibleFaces = 0;

    for (const face of this.faces) {
      const faceVertices = face
        .map((i) => projectedVertices[i])
        .filter((v) => v !== null);

      if (faceVertices.length >= 3 && faceVertices.some((v) => v.isVisible)) {
        this.numberOfVisibleFaces++;
        const avgZ =
          faceVertices.reduce((sum, v) => sum + v.z, 0) / faceVertices.length;

        const maxDistance = camera.maxDistanceToRender * 0.9;
        const minDistance = 5;
        const distanceFactor = Math.min(
          Math.max((avgZ - minDistance) / (maxDistance - minDistance), 0),
          1
        );

        if (avgZ > camera.maxDistanceToRender) {
          continue;
        }

        const r = (this.color >> 16) & 0xff;
        const g = (this.color >> 8) & 0xff;
        const b = this.color & 0xff;

        // Use the darkenFactor parameter
        const darkFactor = 1 - distanceFactor * darkenFactor;
        const newR = Math.floor(r * darkFactor);
        const newG = Math.floor(g * darkFactor);
        const newB = Math.floor(b * darkFactor);

        const shadedColor = (newR << 16) | (newG << 8) | newB;

        this.graphics.beginFill(shadedColor);
        this.graphics.moveTo(faceVertices[0].x, faceVertices[0].y);

        for (let i = 1; i < faceVertices.length; i++) {
          this.graphics.lineTo(faceVertices[i].x, faceVertices[i].y);
        }

        this.graphics.closePath();
        this.graphics.endFill();

        this.graphics.lineStyle(1, 0x000000, 0.1);
        this.graphics.moveTo(faceVertices[0].x, faceVertices[0].y);
        for (let i = 1; i < faceVertices.length; i++) {
          this.graphics.lineTo(faceVertices[i].x, faceVertices[i].y);
        }
        this.graphics.closePath();
        this.graphics.lineStyle(0);
      }
    }

    this.ratioOfVisibleFaces = this.numberOfVisibleFaces / this.faces.length;
  }

  // Method to regenerate ground with new size
  regenerate(size) {
    this.size = size;
    this.generateGroundMesh(size);
  }
}

export default Ground;
