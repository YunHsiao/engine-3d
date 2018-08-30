import { box, enums, intersect } from '.';
import { vec3 } from '../vmath';
import { FixedArray } from '../memop';

let mul = function(out, v, x, y, z) {
  return vec3.set(out, v.x * x, v.y * y, v.z * z);
};

class OctreeBlock {
  constructor(minPos, maxPos, capacity, depth, maxDepth, getBoundingShape) {
    this.minPos = minPos;
    this.maxPos = maxPos;
    this.boundingBox = box.fromPoints(minPos, maxPos);
    this.capacity = capacity;
    this.depth = depth;
    this.maxDepth = maxDepth;
    this._getBoundingShape = getBoundingShape;
    this.blocks = null;
    this.entries = new FixedArray(this.capacity);
  }

  addEntry(entry) {
    if (this.blocks) {
      for (let i = 0; i < this.blocks.length; i++) {
        this.blocks[i].addEntry(entry);
      }
    } else {
      const { type, shape } = this._getBoundingShape(entry);
      if (!intersect.resolve(enums.SHAPE_BOX, type, this.boundingBox, shape)) return;
      this.entries.push(entry);
      if (this.entries.length >= this.capacity && this.depth < this.maxDepth) {
        this.blocks = Octree.createBlocks(this.minPos, this.maxPos, this.entries,
          this.capacity, this.depth, this.maxDepth, this._getBoundingShape);
        this.entries = null;
      }
    }
  }

  removeEntry(entry) {
    if (this.blocks) {
      for (let i = 0; i < this.blocks.length; i++) {
        this.blocks[i].removeEntry(entry);
      }
    } else {
      this.entries.fastRemove(this.entries.indexOf(entry));
    }
  }

  select(out, type, shape) {
    if (!intersect.resolve(enums.SHAPE_BOX, type, this.boundingBox, shape)) return;
    if (this.blocks) {
      for (let i = 0; i < this.blocks.length; i++) {
        this.blocks[i].select(out, type, shape);
      }
    } else {
      for (let i = 0; i < this.entries.length; i++) {
        out.add(this.entries.data[i]);
      }
    }
  }
  
  frustumSelect(out, frustum) {
    if (!intersect.box_frustum(this.boundingBox, frustum)) return;
    if (this.blocks) {
      for (let i = 0; i < this.blocks.length; i++) {
        this.blocks[i].frustumSelect(out, frustum);
      }
    } else {
      for (let i = 0; i < this.entries.length; i++) {
        out.add(this.entries.data[i]);
      }
    }
  }
}

/**
 * An octree acceleration data structure
 */
export default class Octree {
  constructor(blockCapacity = 32, maxDepth = 5) {
    this.blockCapacity = blockCapacity;
    this.maxDepth = maxDepth;
    this.blocks = [];
    this.dynamics = [];
    this._selection = new Set();
    this._getBoundingShape = () => { return this._getBoundingShape; };
  }

  build(entries, getBoundingShape) {
    // calc world min & max
    let worldMin = vec3.create(Infinity, Infinity, Infinity);
    let worldMax = vec3.create(-Infinity, -Infinity, -Infinity);
    let minPos = vec3.create();
    let maxPos = vec3.create();
    let staticEntries = []; this.dynamics = [];
    for (let i = 0; i < entries.length; i++) {
      let entry = (entries.data || entries)[i];
      const { shape } = getBoundingShape(entry);
      if (!shape) {
        this.dynamics.push(entry);
      } else {
        shape.getBoundary(minPos, maxPos);
        vec3.min(worldMin, worldMin, minPos);
        vec3.max(worldMax, worldMax, maxPos);
        staticEntries.push(entry);
      }
    }
    this.blocks = Octree.createBlocks(worldMin, worldMax, staticEntries,
      this.blockCapacity, 0, this.maxDepth, getBoundingShape);
    this._getBoundingShape = getBoundingShape;
  }

  addEntry(entry) {
    if (!this._getBoundingShape(entry).shape) {
      this.dynamics.push(entry);
      return;
    }
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].addEntry(entry);
    }
  }

  removeEntry(entry) {
    if (!this._getBoundingShape(entry).shape) {
      this.dynamics.splice(this.dynamics.indexOf(entry), 1);
      return;
    }
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].removeEntry(entry);
    }
  }

  select(type, shape) {
    this._selection.clear();
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].select(this._selection, type, shape);
    }
    for (let i = 0; i < this.dynamics.length; i++) {
      this._selection.add(this.dynamics[i]);
    }
    return this._selection;
  }

  frustumSelect(frustum) {
    this._selection.clear();
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].frustumSelect(this._selection, frustum);
    }
    for (let i = 0; i < this.dynamics.length; i++) {
      this._selection.add(this.dynamics[i]);
    }
    return this._selection;
  }

  static createBlocks(worldMin, worldMax, entries, blockCapacity, curDepth, maxDepth, getBoundingShape) {
    let blocks = [];
    let blockSize = vec3.create();
    vec3.scale(blockSize, vec3.sub(blockSize, worldMax, worldMin), 0.5);
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          let localMin = vec3.create(), localMax = vec3.create();
          vec3.add(localMin, worldMin, mul(localMin, blockSize, x, y, z));
          vec3.add(localMax, worldMin, mul(localMax, blockSize, x + 1, y + 1, z + 1));
          let block = new OctreeBlock(localMin, localMax,
            blockCapacity, curDepth + 1, maxDepth, getBoundingShape);
          for (let i = 0; i < entries.length; i++) {
            let entry = (entries.data || entries)[i];
            block.addEntry(entry);
          }
          blocks.push(block);
        }
      }
    }
    return blocks;
  }
}