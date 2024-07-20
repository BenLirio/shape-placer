export interface CharacterDefinition {
  stats: {
    health: number;
    speed: number;
    attack: number;
  };
  ranged: boolean;
}
const isCharacterDefinition = (shape: any): shape is CharacterDefinition => {
  return (
    typeof shape.stats === "object" &&
    typeof shape.stats.health === "number" &&
    typeof shape.stats.speed === "number" &&
    typeof shape.stats.attack === "number" &&
    typeof shape.ranged === "boolean"
  );
};
export const toCharacterDefinition = (shape: any): CharacterDefinition => {
  if (!isCharacterDefinition(shape)) {
    throw new Error("Shape is not a CharacterDefinition");
  }
  return shape;
};
export const CHARACTER_DEFINITION_STRING = `export interface CharacterDefinition {
  stats: {
    health: number; // 0 to 1
    speed: number; // 0 to 1
    attack: number; // 0 to 1
  };
  ranged: boolean;
}`;

export interface CharacterState {
  characterDefinition: CharacterDefinition;
  stats: {
    health: number;
  };
  position: {
    x: number;
    y: number;
  };
}
