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
