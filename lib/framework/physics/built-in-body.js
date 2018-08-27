import { box, sphere, enums, intersect } from '../../geom-utils';

let _typeMap = {
  box: enums.SHAPE_BOX,
  sphere: enums.SHAPE_SPHERE
};


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
    this.shapeType = _typeMap[options.type];
    this._shapeModelSpace = this.createShape(options);
    this.shape = this.createShape(options);
    this.collisionFilterGroup = 1;
    this.collisionFilterMask  = 1;
    this._updateTransform = part => {
      this._entity.updateWorldTransform();
      if (part === 'pos') {
        this._shapeModelSpace.translate(this._entity._pos, this.shape);
      } else if (part === 'rot') {
        this._shapeModelSpace.rotate(this._entity._rot, this.shape);
      } else {
        this._shapeModelSpace.scale(this._entity._scale, this.shape);
      }
    };
    this._updateTransform();
    this._entity.on('transformChanged', this._updateTransform);
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
        console.warn('Unsupported collider type');
        return box.create(); // default to a unit half extents box
    }
  }

  setCollisionFilter(group, mask) {
    this.collisionFilterGroup = group;
    this.collisionFilterMask  = mask;
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

  setMaterial() { /* no physics involved */ }

  // rigidbody functionalities not implemented in built-in engine
  setMass() {}
  setDrag() {}
  setAngularDrag() {}
  setUseGravity() {}
  setIsKinematic() {}
  setFreezeRotation() {}
}
