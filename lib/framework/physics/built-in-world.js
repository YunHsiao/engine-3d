import { FixedArray } from '../../memop';

let event = {
  body: null,
  target: null
};

/**
 * Built-in collision system, intended for use as a
 * efficient discrete collision detector,
 * not a full physical simulator
 */
export default class BuiltInWorld {
  constructor() {
    this._cols = new FixedArray(200);
  }
  
  add(comp) {
    this._cols.push(comp.body);
  }

  remove(comp) {
    for (let i = 0; i < this._cols.length; ++i) {
      let c = this._cols.data[i];
      if (c === comp.body) {
        this._cols.fastRemove(i);
        break;
      }
    }
  }

  step() {
    for (let i = 0; i < this._cols.length; ++i) {
      let col = this._cols.data[i];
      col.updateTransform();
    }
    
    for (let i = 0; i < this._cols.length; ++i) {
      let bodyA = this._cols.data[i];

      for (let j = i + 1; j < this._cols.length; ++j) {
        let bodyB = this._cols.data[j];

        if( (bodyA.collisionFilterGroup & bodyB.collisionFilterMask) === 0 ||
          (bodyB.collisionFilterGroup & bodyA.collisionFilterMask) === 0) {
          continue;
        }

        if (bodyA.intersect(bodyB)) {
          event.body = bodyA; event.target = bodyB;
          bodyA._entity.emit('collide', event);
          event.body = bodyB; event.target = bodyA;
          bodyB._entity.emit('collide', event);
        }
      }
    }
  }
}
