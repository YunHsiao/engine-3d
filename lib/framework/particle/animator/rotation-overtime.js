import { pseudoRandom } from "../../../vmath";

const ROTATION_OVERTIME_RAND_OFFSET = 125292;

export default class RotationOvertimeModule {
  constructor() {

  }

  animate(p, dt) {
    let normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
    if (!this._separateAxes) {
      p.rotation.x += this._z.evaluate(normalizedTime, pseudoRandom(p.randomSeed + ROTATION_OVERTIME_RAND_OFFSET)) * dt;
    }
    else {
      // TODO: separateAxes is temporarily not supported!
    }
  }
}

RotationOvertimeModule.schema = {

  enable: {
    type: 'boolean',
    default: false
  },

  separateAxes: {
    type: 'boolean',
    default: false,
    set(val) {
      if (!val) {
        this._separateAxes = val;
      }
      else {
        console.error('rotation overtime separateAxes is not supported!');
      }
    }
  },

  x: {
    type: 'CurveRange',
    default: null
  },

  y: {
    type: 'CurveRange',
    default: null
  },

  z: {
    type: 'CurveRange',
    default: null
  }
};