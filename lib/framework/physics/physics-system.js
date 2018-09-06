import { System } from '../../ecs';
import BuiltInBody from './built-in-body';
import BuiltInWorld from './built-in-world';
import CannonBody from './cannon-body';
import CannonWorld from './cannon-world';

const enums = {
  ENGINE_BUILTIN: 0,
  ENGINE_CANNON: 1,
};

export default class PhysicsSystem extends System {
  constructor() {
    super();
    this._engine = enums.ENGINE_CANNON;
    this.fixedTimeStep = 1 / 60;
  }

  init() {
    switch (this._engine) {
      case enums.ENGINE_BUILTIN:
        this.ctorWorld = BuiltInWorld;
        this.ctorBody = BuiltInBody;
        break;
      case enums.ENGINE_CANNON:
        this.ctorWorld = CannonWorld;
        this.ctorBody = CannonBody;
        break;
    }
    this.world = new this.ctorWorld();
  }

  /**
   * Set the actual physics engine under the hood.
   * Must be called before app.assets.loadLevel and any entity.addComp
   * @param {number} val the engine to use
   */
  set engine(val) {
    this._engine = val;
    this.init();
  }

  /**
   * Ray cast against all colliders.
   * The provided callback will be executed for each hit.
   *
   * @param {ray} ray The starting point and direction of the ray.
   * @param {number} maxDistance The max distance the ray should check for collisions.
   * @param {function(result: Object)} callback the collision callback function
   * @param {Object} options Other options specifying the process.
   * @param {number} [options.collisionFilterMask=-1] The groups this ray intersect with
   * @param {number} [options.collisionFilterGroup=-1] The groups this ray belong to
   * @param {boolean} [options.queryTriggerInteraction=false] Specifies whether this query should hit Triggers.
   * @returns {boolean} True when the ray intersects any collider, otherwise false.
   */
  raycastAll(ray, maxDistance, callback, options) {
    return this.world.raycastAll(ray, maxDistance, callback, options);
  }

  /**
   * Ray cast, and stop at the first result.
   * Note that the order is random - but the method is fast.
   *
   * @param {ray} ray The starting point and direction of the ray.
   * @param {number} maxDistance The max distance the ray should check for collisions.
   * @param {Object} [result] an object for receiving the intersection result, or null if doesn't care
   * @param {Object} options Other options specifying the process.
   * @param {number} [options.collisionFilterMask=-1] The groups this ray intersect with
   * @param {number} [options.collisionFilterGroup=-1] The groups this ray belong to
   * @param {boolean} [options.queryTriggerInteraction=false] Specifies whether this query should hit Triggers.
   * @returns {boolean} True when the ray intersects any collider, otherwise false.
   */
  raycastAny(ray, maxDistance, result, options) {
    return this.world.raycastAny(ray, maxDistance, result, options);
  }

  /**
   * Ray cast, and return information of the closest hit.
   *
   * @param {ray} ray The starting point and direction of the ray.
   * @param {number} maxDistance The max distance the ray should check for collisions.
   * @param {Object} [result] an object for receiving the intersection result, or null if doesn't care
   * @param {Object} options Other options specifying the process.
   * @param {number} [options.collisionFilterMask=-1] The groups this ray intersect with
   * @param {number} [options.collisionFilterGroup=-1] The groups this ray belong to
   * @param {boolean} [options.queryTriggerInteraction=false] Specifies whether this query should hit Triggers.
   * @returns {boolean} True when the ray intersects any collider, otherwise false.
   */
  raycastClosest(ray, maxDistance, result, options) {
    return this.world.raycastClosest(ray, maxDistance, result, options);
  }

  add(comp) {
    comp.body = new this.ctorBody(comp);
    this.world.add(comp);
  }

  remove(comp) {
    this.world.remove(comp);
  }

  postTick() {
    this.world.step(this.fixedTimeStep);
  }
}

Object.assign(PhysicsSystem, enums);
