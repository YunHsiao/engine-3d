import CANNON from 'cannon';

export default class CannonWorld extends CANNON.World {
  constructor() {
    super();
    this.gravity.set(0, -9.82, 0);
  }

  setGravity(x, y, z) {
    this.gravity.set(x, y, z);
  }
  
  add(comp) {
    this.addBody(comp.body);
  }

  remove(comp) {
    this.removeBody(comp.body);
  }
}
