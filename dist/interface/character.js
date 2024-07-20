"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_DEFINITION_STRING = exports.toCharacterDefinition = void 0;
const isCharacterDefinition = (shape) => {
    return (typeof shape.stats === "object" &&
        typeof shape.stats.health === "number" &&
        typeof shape.stats.speed === "number" &&
        typeof shape.stats.attack === "number" &&
        typeof shape.ranged === "boolean");
};
const toCharacterDefinition = (shape) => {
    if (!isCharacterDefinition(shape)) {
        throw new Error("Shape is not a CharacterDefinition");
    }
    return shape;
};
exports.toCharacterDefinition = toCharacterDefinition;
exports.CHARACTER_DEFINITION_STRING = `export interface CharacterDefinition {
  stats: {
    health: number; // 0 to 1
    speed: number; // 0 to 1
    attack: number; // 0 to 1
  };
  ranged: boolean;
}`;
//# sourceMappingURL=character.js.map