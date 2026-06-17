declare module "rbush" {
  interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  class RBush<T extends BBox = BBox> {
    load(items: ReadonlyArray<T>): this;
    insert(item: T): this;
    remove(item: T, equals?: (a: T, b: T) => boolean): this;
    search(bbox: BBox): T[];
    collides(bbox: BBox): boolean;
    all(): T[];
    clear(): this;
    toJSON(): object;
    fromJSON(data: object): this;
  }

  export default RBush;
}
