import CANNON from 'cannon';
import { vec3 } from '../../vmath';

export default class CannonWorld extends CANNON.World {
  constructor() {
    super();
    this.gravity.set(0, -9.82, 0);
    this._raycast_to = new CANNON.Vec3();
    this._raycast_result = this.createRaycastResult();
    this._raycast_default_option = {
      collisionFilterGroup: -1,
      collisionFilterMask: -1,
      queryTriggerInteraction: false
    };
    this._beforeStep_event = { type: 'beforeStep' };
  }

  add(comp) {
    this.addBody(comp.body);
  }

  remove(comp) {
    this.removeBody(comp.body);
  }

  raycastAll(ray, maxDistance, callback, options) {
    options = this._convertArguments(ray, maxDistance, options);
    return super.raycastAll(ray.o, this._raycast_to, options, callback);
  }

  raycastAny(ray, maxDistance, result, options) {
    options = this._convertArguments(ray, maxDistance, options);
    if (!result) result = this._raycast_result;
    return super.raycastAny(ray.o, this._raycast_to, options, result);
  }
  
  raycastClosest(ray, maxDistance, result, options) {
    options = this._convertArguments(ray, maxDistance, options);
    if (!result) result = this._raycast_result;
    return super.raycastClosest(ray.o, this._raycast_to, options, result);
  }

  _convertArguments(ray, maxDistance, options) {
    if (maxDistance === Infinity) {
      console.warn('Infinity distance raycast not supported in Cannon, clamped to (1 << 30)');
      maxDistance = 1 << 30;
    }
    vec3.scaleAndAdd(this._raycast_to, ray.o, ray.d, maxDistance);
    if (!options) return this._raycast_default_option;
    options.checkCollisionResponse = !options.queryTriggerInteraction;
    return options;
  }

  step(dt) {
    this.dispatchEvent(this._beforeStep_event);
    super.internalStep(dt);
  }
  
  // util functions
  createRaycastResult() {
    return new CANNON.RaycastResult();
  }

  createContactMaterial(comp1, comp2, options) {
    if (!comp1.body.material || !comp2.body.material) {
      console.warn("cannon create contact material with default materials!");
      return;
    }
    return new CANNON.ContactMaterial(comp1.body.material, comp2.body.material, options);
  }

  createLockConstraint(comp1, comp2, options) {
    if (options.axisA) options.axisA = new CANNON.Vec3(options.axisA.x, options.axisA.y, options.axisA.z);
    if (options.axisB) options.axisB = new CANNON.Vec3(options.axisB.x, options.axisB.y, options.axisB.z);
    return new CANNON.LockConstraint(comp1.body, comp2.body, options);
  }

  createHingeConstraint(comp1, comp2, options) {
    if (options.pivotA) options.pivotA = new CANNON.Vec3(options.pivotA.x, options.pivotA.y, options.pivotA.z);
    if (options.pivotB) options.pivotB = new CANNON.Vec3(options.pivotB.x, options.pivotB.y, options.pivotB.z);
    if (options.axisA) options.axisA = new CANNON.Vec3(options.axisA.x, options.axisA.y, options.axisA.z);
    if (options.axisB) options.axisB = new CANNON.Vec3(options.axisB.x, options.axisB.y, options.axisB.z);
    return new CANNON.HingeConstraint(comp1.body, comp2.body, options);
  }

  createDistanceConstraint(comp1, comp2, distance, maxForce) {
    return new CANNON.DistanceConstraint(comp1.body, comp2.body, distance, maxForce);
  }

  createConeTwistConstraint(comp1, comp2, options) {
    if (options.pivotA) options.pivotA = new CANNON.Vec3(options.pivotA.x, options.pivotA.y, options.pivotA.z);
    if (options.pivotB) options.pivotB = new CANNON.Vec3(options.pivotB.x, options.pivotB.y, options.pivotB.z);
    if (options.axisA) options.axisA = new CANNON.Vec3(options.axisA.x, options.axisA.y, options.axisA.z);
    if (options.axisB) options.axisB = new CANNON.Vec3(options.axisB.x, options.axisB.y, options.axisB.z);
    return new CANNON.ConeTwistConstraint(comp1.body, comp2.body, options);
  }

  createPointToPointConstraint(comp1, comp2, pivot1, pivot2, maxForce) {
    let p1 = pivot1 ? new CANNON.Vec3(pivot1.x, pivot1.y, pivot1.z) : undefined;
    let p2 = pivot2 ? new CANNON.Vec3(pivot2.x, pivot2.y, pivot2.z) : undefined;
    return new CANNON.ConeTwistConstraint(comp1.body, p1, comp2.body, p2, maxForce);
  }
}
