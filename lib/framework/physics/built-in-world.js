import { FixedArray } from '../../memop';
import { vec3 } from '../../vmath';
import { ray, intersect } from '../../geom-utils';

let event = {
  body: null,
  target: null
};

let RAYCAST_MODE = {
  ALL: 0,
  ANY: 1,
  CLOSEST: 2
};

/**
 * Built-in collision system, intended for use as a
 * efficient discrete collision detector,
 * not a full physical simulator
 */
export default class BuiltInWorld {
  constructor() {
    this._cols = new FixedArray(200);
    this._raycast_ray = ray.create();
    this._raycast_result = this.createRaycastResult();
    this._raycast_intersection = vec3.create();
    this._raycast_default_option = {
      collisionFilterGroup: -1,
      collisionFilterMask: -1,
      queryTriggerInteraction: true // all built-in colliders are like triggers
    };
  }
  
  add(comp) {
    this._cols.push(comp.body);
  }

  remove(comp) {
    this._cols.fastRemove(this._cols.indexOf(comp));
  }

  raycastAll(ray, maxDistance, callback, options) {
    if (!options) options = this._raycast_default_option;
    return this._intersectRay(RAYCAST_MODE.ALL, ray, maxDistance, options,
      this._raycast_result, callback);
  }
  
  raycastAny(ray, maxDistance, result, options) {
    if (!result) result = this._raycast_result;
    if (!options) options = this._raycast_default_option;
    return this._intersectRay(RAYCAST_MODE.ANY, ray, maxDistance, options, result);
  }
  
  raycastClosest(ray, maxDistance, result, options) {
    if (!result) result = this._raycast_result;
    if (!options) options = this._raycast_default_option;
    result.distance = Infinity;
    return this._intersectRay(RAYCAST_MODE.CLOSEST, ray, maxDistance, options, result);
  }
  
  createRaycastResult() {
    return {};
  }

  step() {
    for (let i = 0; i < this._cols.length; ++i) {
      let body = this._cols.data[i];
      if (body._entity._dirty || body._dirty) {
        body._updateTransform();
      }
    }

    for (let i = 0; i < this._cols.length; ++i) {
      let bodyA = this._cols.data[i];

      for (let j = i + 1; j < this._cols.length; ++j) {
        let bodyB = this._cols.data[j];

        if ( (bodyA.collisionFilterGroup & bodyB.collisionFilterMask) === 0 ||
          (bodyB.collisionFilterGroup & bodyA.collisionFilterMask) === 0) {
          continue;
        }

        if (bodyA.intersect(bodyB)) {
          event.target = bodyA; event.body = bodyB;
          bodyA._entity.emit('collide', event);
          event.target = bodyB; event.body = bodyA;
          bodyB._entity.emit('collide', event);
        }
      }
    }
  }

  _intersectRay(mode, ray, maxDist, options, result, callback) {
    let mask = options.collisionFilterMask || -1;
    let group = options.collisionFilterGroup || -1;
    let intersected = false;
    // fixme: brute-force traversal
    for (let i = 0; i < this._cols.length; i++) {
      let col = this._cols.data[i];
      if ((group & col.collisionFilterMask) === 0 ||
        (col.collisionFilterGroup & mask) === 0) continue;
      let t = intersect.resolve(ray, col.shape);
      if (t === false || t > maxDist) continue;

      if (mode === RAYCAST_MODE.CLOSEST && t > result.distance) continue;
      intersected = true;
      result.body = col;
      result.distance = t;
      if (mode === RAYCAST_MODE.ANY) return true;
      if (callback) callback(result);
    }
    return intersected;
  }
}
