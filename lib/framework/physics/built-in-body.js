import { vec3, quat } from '../../vmath';
import { box, sphere, enums, intersect } from '../../geom-utils';

let typeMap = {
  box: enums.SHAPE_BOX,
  sphere: enums.SHAPE_SPHERE
};

let v3_tmp = vec3.zero();
let qt_tmp = quat.create();
let v3_tmp2 = vec3.zero();

/**
 * Built-in static collider, no physical forces involved
 */
export default class BuiltInBody {
  constructor(options) {
    // save the entity reference
    this._entity = options._entity;
    this._system = options._system;
    this._world = options._system.world;
    // create shape
    this.shapeType = typeMap[options.type];
    this._shapeModelSpace = this.createShape(options);
    this.shape = this.createShape(options);
    this._system._fullSimulation = true;
    this.collisionFilterGroup = 1;
    this.collisionFilterMask  = 1;
  }
  
  createShape(options) {
    switch (options.type) {
      case 'box':
        return box.new(options.center.x, options.center.y, options.center.z,
          options.size.x * 0.5, options.size.y * 0.5, options.size.z * 0.5,
          1, 0, 0, 0, 1, 0, 0, 0, 1);
      case 'sphere':
        return sphere.new(options.center.x, options.center.y, options.center.z, options.radius);
      default:
        console.warn('Unsupported collider type - only boxes and spheres are supported');
        return box.create(); // default to a unit half extents box
    }
  }

  setCollisionFilter(group, mask) {
    this.collisionFilterGroup = group;
    this.collisionFilterMask  = mask;
  }

  updateTransform() {
    this._entity._getWorldPRS(v3_tmp, qt_tmp, v3_tmp2);
    this.shape.setTransform(v3_tmp, qt_tmp, v3_tmp2, this._shapeModelSpace);
  }

  intersect(that) {
    return intersect.resolve(this.shapeType, that.shapeType, this.shape, that.shape);
  }

  setCenter(val) {
    this._shapeModelSpace.center = val;
  }

  setSize(val) {
    if (this.shapeType != enums.SHAPE_BOX) return;
    this._shapeModelSpace.halfExtents = val;
  }

  setRadius(val) {
    if (this.shapeType != enums.SHAPE_SPHERE) return;
    this._shapeModelSpace.r = val;
  }

  setIsTrigger() { /* always behaves like a trigger */ }

  // rigidbody functionalities not implemented in built-in engine
  setMass() {}
  setDrag() {}
  setAngularDrag() {}
  setIsKinematic() {}
  setFreezeRotation() {}
}
