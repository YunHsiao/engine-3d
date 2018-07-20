import CANNON from 'cannon';

const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;

export default class CannonWorld extends CANNON.World {
  constructor() {
    super();
    this.gravity.set(0, -9.82, 0);
  }

  setGravity(x, y, z) {
    this.gravity.set(x, y, z);
  }
  
  add(comp) {
    this.addBody(comp.collider);
  }

  remove(comp) {
    this.removeBody(comp.collider);
  }

  step(dt) {
    super.step(fixedTimeStep, dt, maxSubSteps);
  }
}
