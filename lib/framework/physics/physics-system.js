import { System } from '../../ecs';
import BuiltInWorld from './built-in-world';
import CannonWorld from './cannon-world';

const enums = {
  ENGINE_BUILTIN: 0,
  ENGINE_CANNON: 1,
};

const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;

export default class PhysicsSystem extends System {
  constructor() {
    super();
    this._engine = enums.ENGINE_CANNON;
    this._fullSimulation = false;
  }

  init() {
    switch (this._engine) {
      case enums.ENGINE_BUILTIN:
        this.world = new BuiltInWorld();
        break;
      case enums.ENGINE_CANNON:
        this.world = new CannonWorld();
        break;
    }
  }
  
  add(comp) {
    this.world.add(comp);
  }

  remove(comp) {
    this.world.remove(comp);
  }

  postTick() {
    if (!this._fullSimulation) return;
    this.world.step(fixedTimeStep, this._app.deltaTime, maxSubSteps);
  }
}

Object.assign(PhysicsSystem, enums);
