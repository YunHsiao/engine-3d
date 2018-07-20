import { Component } from '../../ecs';
import PhysicsSystem from './physics-system';
import BuiltInCollider from './built-in-collider';
import CannonCollider from './cannon-collider';

export default class ColliderComponent extends Component {
  constructor() {
    super();
  }
  
  onInit() {
    switch (this._system._engine) {
      case PhysicsSystem.ENGINE_BUILTIN:
        this.collider = new BuiltInCollider(this);
        break;
      case PhysicsSystem.ENGINE_CANNON:
        this.collider = new CannonCollider(this);
        break;
    }
    /**
     * **@schema** The collider type, is either 'box' or 'sphere'
     * @type {string}
     */
    this.type = this._type;
    /**
     * **@schema** The rigidbody mass, 0 for static objects
     * @type {number}
     */
    this.mass = this._mass;
    /**
     * **@schema** Controlls whether physics affects the rigidbody.
     * @type {boolean}
     */
    this.isKinematic = this._isKinematic;
    /**
     * **@schema** center of the collider
     * @type {vec3}
     */
    this.center = this._center;
    /**
     * **@schema** size of the box collider
     * @type {vec3}
     */
    this.size = this._size;
    /**
     * **@schema** radius of the sphere collider
     * @type {number}
     */
    this.radius = this._radius;

    this._system.add(this);
  }

  onDestroy() {
    this._system.remove(this);
  }
}

ColliderComponent.schema = {
  type: {
    type: 'string',
    default: 'box'
  },
  isKinematic: {
    type: 'boolean',
    default: false,
    set(val) {
      this._isKinematic = val;
      this.collider.setIsKinematic(val);
      if (val) this._system._fullSimulation = true;
    }
  },
  mass: {
    type: 'number',
    default: 0,
    set(val) {
      this._mass = val;
      this.collider.setMass(val);
      if (val > 0) this._system._fullSimulation = true;
    }
  },
  center: {
    type: 'vec3',
    default: [0, 0, 0],
    set(val) {
      this._center = val;
      this.collider.setCenter(val);
    }
  },
  size: {
    type: 'vec3',
    default: [2, 2, 2],
    set(val) {
      this._size = val;
      this.collider.setSize(val);
    }
  },
  radius: {
    type: 'number',
    default: 1,
    set(val) {
      this._radius = val;
      this.collider.setRadius(val);
    }
  }
};