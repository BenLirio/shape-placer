"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareString = exports.toSquare = void 0;
const isSquare = (shape) => {
    return (typeof shape.position === "object" &&
        typeof shape.position.x === "number" &&
        typeof shape.position.y === "number" &&
        typeof shape.width === "number");
};
const toSquare = (shape) => {
    if (!isSquare(shape)) {
        throw new Error("Shape is not a Square");
    }
    return shape;
};
exports.toSquare = toSquare;
exports.SquareString = `export interface Square {
  position: {
    x: number;
    y: number;
  };
  width: number;
}`;
//# sourceMappingURL=shapes.js.map