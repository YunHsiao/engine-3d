import { Component } from '../../ecs';

export default class ColliderComponent extends Component {
  constructor() {
    super();
  }
  
  onInit() {
    // engine specific init happens here
    this._system.add(this);
    
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