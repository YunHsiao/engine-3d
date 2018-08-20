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
