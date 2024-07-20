export interface Square {
  position: {
    x: number;
    y: number;
  };
  width: number;
}
const isSquare = (shape: any): shape is Square => {
  return (
    typeof shape.position === "object" &&
    typeof shape.position.x === "number" &&
    typeof shape.position.y === "number" &&
    typeof shape.width === "number"
  );
};
export const toSquare = (shape: any): Square => {
  if (!isSquare(shape)) {
    throw new Error("Shape is not a Square");
  }
  return shape;
};
export const SquareString = `export interface Square {
  position: {
    x: number;
    y: number;
  };
  width: number;
}`;
