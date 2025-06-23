import Object3D from "./Object3D.js";

// Crear sprite 3D con billboarding
export function createSprite3D(
  x,
  y,
  z,
  size = 1,
  color = 0xff0000,
  textureUrl = null
) {
  const sprite = new Object3D(x, y, z, textureUrl);
  sprite.size = size;
  sprite.color = color;
  sprite.isSprite = true;
  sprite.needsUpdate = true;
  return sprite;
}

// Crear piso
export function createGround(size = 20) {
  const ground = new Object3D(0, 0, 0);
  ground.color = 0x99ff99;
  ground.vertices = [];
  ground.faces = [];

  // Crear grid del piso con más densidad cerca de la cámara
  const step = 2;
  for (let x = -size * 2; x <= size * 2; x += step) {
    // Extended size
    for (let z = -size * 2; z <= size * 2; z += step) {
      // Extended size
      const baseIndex = ground.vertices.length;
      const y = 0;
      ground.vertices.push(
        [x, y, z],
        [x + step, y, z],
        [x + step, y, z + step],
        [x, y, z + step]
      );
      ground.faces.push([
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex + 3,
      ]);
    }
  }

  return ground;
}
