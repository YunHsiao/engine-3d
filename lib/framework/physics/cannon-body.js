import { vec3, quat } from '../../vmath';
import CANNON from 'cannon';

let v3_tmp = vec3.zero();
let qt_tmp = quat.create();

function maxComponent(v) { return Math.max(Math.max(v.x, v.y), v.z); }

export default class CannonBody extends CANNON.Body {
  /**
   * Create a rigidbody with respect to its world transform
   * @param {ColliderComponent|Object} options
   * @param {Entity} options._entity the entity this body is attached to
   * @param {PhysicsSystem} options._system the physics system
   * @param {string} options.type the type of the shape
   * @param {vec3} options.center the center of the shape
   * @param {vec3} options.size the size of the box
   * @param {number} options.radius the radius of the sphere
   */
  constructor(options) {
    super(options);
    // save references
    this._entity = options._entity;
    this._system = options._system;
    this._world = options._system.world;
    this._size = vec3.clone(options.size);
    this._radius = options.radius;
    // create shape
    this.shapeType = options.type;
    this.shape = this.createShape(options);
    this.addShape(this.shape, new CANNON.Vec3().copy(options.center));
    // dispatch collision events to entity
    this.addEventListener('collide', (event) => {
      // TODO: uniform event interface across engines
      this._entity.emit('collide', event);
    });
    this._cancelOutGravity = () => {
      this.force.x -= this._world.gravity.x * this.mass;
      this.force.y -= this._world.gravity.y * this.mass;
      this.force.z -= this._world.gravity.z * this.mass;
    };
    this._updateIn = () => {
      this._entity._getWorldPosAndRot(v3_tmp, qt_tmp);
      this.position.copy(v3_tmp);
      if (!this.fixedRotation) this.quaternion.copy(qt_tmp);
    };
    this._updateOut = () => {
      this._entity.setWorldPos(this.position);
      if (!this.fixedRotation) this._entity.setWorldRot(this.quaternion);
    };
    this._updateIn(); // TODO: emit event after transform change perhaps?
  }
  
  /**
   * Create a shape for this body,
   * the size are automatically scaled wrt. its world transform
   * @param {Object} options
   * @param {string} options.type the type of the shape
   * @param {vec3} options.size the size of the box
   * @param {number} options.radius the radius of the sphere
   * @returns {CANNON.Shape}
   */
  createShape(options) {
    this._entity.getWorldScale(v3_tmp);
    switch (options.type) {
      case 'box':
        vec3.scale(v3_tmp, vec3.mul(v3_tmp, v3_tmp, options.size), 0.5);
        return new CANNON.Box(new CANNON.Vec3(v3_tmp.x, v3_tmp.y, v3_tmp.z));
      case 'sphere':
        return new CANNON.Sphere(options.radius * maxComponent(v3_tmp));
      default:
        console.warn('Unsupported collider type - only boxes and spheres are supported');
        // default to a unit half extents box
        return new CANNON.Box(new CANNON.Vec3(v3_tmp.x, v3_tmp.y, v3_tmp.z));
    }
  }

  /**
   * Set the collision filter of this body, remember that they are tested bitwise
   * @param {number} group the group which this body will be put into
   * @param {number} mask the groups which this body can collide with
   */
  setCollisionFilter(group, mask) {
    this.collisionFilterGroup = group;
    this.collisionFilterMask  = mask;
  }

  /**
   * Is this body currently in contact with the specified body?
   * @param {CannonBody} body the body to test against
   * @returns {boolean}
   */
  isInContactWith(body) {
    return this._world.collisionMatrix.get(this, body) > 0;
  }

  /**
   * Set the mass of the body
   * @param {number} val the new mass
   */
  setMass(val) {
    this.mass = val;
    this.updateMassProperties();
    this._validateTypeAndMode();
  }

  /**
   * Set the drag of the body
   * @param {number} val [0, 1] the drag
   */
  setDrag(val) {
    this.linearDamping = val;
  }

  /**
   * Set the angular drag of the body
   * @param {number} val [0, 1] the angular drag
   */
  setAngularDrag(val) {
    this.angularDamping = val;
  }

  /**
   * Set whether gravity affects this body
   * @param {boolean} val
   */
  setUseGravity(val)  {
    if (val) this._world.removeEventListener('preStep', this._cancelOutGravity);
    else this._world.addEventListener('preStep', this._cancelOutGravity);
  }
  
  /**
   * Set whether physics affects this body
   * @param {boolean} val
   */
  setIsKinematic(val) {
    this._isKinematic = val;
    this._validateTypeAndMode();
  }

  /**
   * Set whether physics will change the rotation of this body
   * @param {boolean} val
   */
  setFreezeRotation(val) {
    this.fixedRotation = val;
    this.updateMassProperties();
  }

  /**
   * Set whether this collider is a trigger
   * @param {boolean} val
   */
  setIsTrigger(val) {
    this.collisionResponse = !val;
  }

  /**
   * Set the physics material used by the collider
   * @param {PhysicsMaterial|Object} mtl
   * @param {number} mtl.friction the friction coefficient
   * @param {number} mtl.bounciness the bounciness coefficient
   */
  setMaterial(mtl) {
    if (!mtl) { this.material = null; return; }
    if (!this.material) this.material = new CANNON.Material();
    this.material.friction = mtl.friction;
    this.material.restitution = mtl.bounciness;
  }

  /**
   * Set the center of this collider
   * @param {vec3} val
   */
  setCenter(val) {
    this.shapeOffsets[0].set(val.x, val.y, val.z);
    this.updateBoundingRadius();
  }

  /**
   * Set the size of this box collider
   * @param {vec3} val
   */
  setSize(val) {
    if (this.shapeType != 'box') return;
    if (!val) val = this._size;
    this._entity.getWorldScale(v3_tmp);
    vec3.scale(v3_tmp, vec3.mul(v3_tmp, v3_tmp, val), 0.5);
    this.shape.halfExtents.set(v3_tmp.x, v3_tmp.y, v3_tmp.z);
    this.shape.updateConvexPolyhedronRepresentation();
    this.shape.updateBoundingSphereRadius();
    this.updateBoundingRadius();
    vec3.copy(this._size, val);
  }

  /**
   * Set the radius of this sphere collider
   * @param {vec3} val
   */
  setRadius(val) {
    if (this.shapeType != 'sphere') return;
    if (!val) val = this._radius;
    this._entity.getWorldScale(v3_tmp);
    this.shape.radius = val * maxComponent(v3_tmp);
    this.shape.updateBoundingSphereRadius();
    this.updateBoundingRadius();
    this._radius = val;
  }

  /**
   * Set per frame update mode of this rigidbody.
   * They are both disabled by default, and `updateOut`
   * is automatically enabled for dynamic objects.
   * For now you have to take care of the `updateIn` part
   * after changing the transform of an object,
   * either to call its `manualUpdate()` everytime,
   * or to just set the `updateIn` to true.
   * @param {boolean} updateIn whether to update world transform into physics system
   * @param {boolean} updateOut whether to update the simulation result into world transform
   */
  setUpdateMode(updateIn, updateOut) {
    if (updateIn) this._world.addEventListener('preStep', this._updateIn);
    else this._world.removeEventListener('preStep', this._updateIn);
    if (updateOut) this._world.addEventListener('postStep', this._updateOut);
    else this._world.removeEventListener('postStep', this._updateOut);
  }

  /**
   * Update the world transform into physics system manually
   * @param {boolean} updateRotation whether to update rotation
   */
  manualUpdate(updateRotation = true) {
    this._entity._getWorldPosAndRot(v3_tmp, qt_tmp);
    this.position.copy(v3_tmp);
    if (updateRotation) this.quaternion.copy(qt_tmp);
    this.setSize(); this.setRadius();
  }

  _validateTypeAndMode() {
    if (this._isKinematic) {
      this.type = CANNON.Body.KINEMATIC; 
    } else {
      this.type = (this.mass <= 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC);
    }
    if (this.type !== CANNON.Body.STATIC) {
      this.setUpdateMode(false, true);
      this._system._fullSimulation = true;
    }
  }
}
