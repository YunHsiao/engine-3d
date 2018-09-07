import { obb, sphere, intersect } from '../../geom-utils';

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
    this.shapeType = options.type;
    this._shapeModelSpace = this.createShape(options);
    this.shape = this.createShape(options);
    this.collisionFilterGroup = 1;
    this.collisionFilterMask  = 1;
    this._updateTransform();
  }

  _updateTransform() {
    this._entity.updateWorldTransformFull();
    this._shapeModelSpace.transform(this._entity._mat, this._entity._pos,
      this._entity._rot, this._entity._scale, this.shape);
  }
  
  createShape(options) {
    switch (options.type) {
      case 'box':
        return obb.create(options.center.x, options.center.y, options.center.z,
          options.size.x * 0.5, options.size.y * 0.5, options.size.z * 0.5,
          1, 0, 0, 0, 1, 0, 0, 0, 1);
      case 'sphere':
        return sphere.create(options.center.x, options.center.y, options.center.z, options.radius);
      default:
        console.warn('Unsupported collider type');
        return obb.create(); // default to a unit half extents box
    }
  }

  setCollisionFilter(group, mask) {
    this.collisionFilterGroup = group;
    this.collisionFilterMask  = mask;
  }

  intersects(that) {
    return intersect.resolve(this.shape, that.shape);
  }

  setCenter(val) {
    this._shapeModelSpace.center = val;
  }

  setSize(val) {
    if (this.shapeType != 'box') return;
    this._shapeModelSpace.halfExtents = val;
  }

  setRadius(val) {
    if (this.shapeType != 'sphere') return;
    this._shapeModelSpace.r = val;
  }

  setIsTrigger() { /* always behaves like a trigger */ }

  setMaterial() { /* no physics involved */ }

  // rigidbody functionalities not implemented in built-in engine
  setMass() {}
  setDrag() {}
  setAngularDrag() {}
  setUseGravity() {}
  setIsKinematic() {}
  setFreezeRotation() {}
}
