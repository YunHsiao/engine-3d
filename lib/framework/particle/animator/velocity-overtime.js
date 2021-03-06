import { vec3, quat, pseudoRandom } from '../../../vmath';
import { calculateTransform } from '../particle-general-function';

const VELOCITY_OVERTIME_RAND_OFFSET = 197866;

export default class VelocityOvertimeModule {
  constructor() {
    this.rotation = quat.create();
  }

  update(space, worldTransform) {
    this.needTransform = calculateTransform(space, this._space, worldTransform, this.rotation);
  }

  animate(p) {
    let normalizedTime = 1 - p.remainingLifetime / p.startLifetime;
    let vel = vec3.create(this._x.evaluate(normalizedTime, pseudoRandom(p.randomSeed + VELOCITY_OVERTIME_RAND_OFFSET)), this._y.evaluate(normalizedTime, pseudoRandom(p.randomSeed + VELOCITY_OVERTIME_RAND_OFFSET)), this._z.evaluate(normalizedTime, pseudoRandom(p.randomSeed + VELOCITY_OVERTIME_RAND_OFFSET)));
    if (this.needTransform) {
      vec3.transformQuat(vel, vel, this.rotation);
    }
    vec3.add(p.animatedVelocity, p.animatedVelocity, vel);
    vec3.add(p.ultimateVelocity, p.velocity, p.animatedVelocity);
    vec3.scale(p.ultimateVelocity, p.ultimateVelocity, this._speedModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, pseudoRandom(p.randomSeed + VELOCITY_OVERTIME_RAND_OFFSET)));
  }

}

VelocityOvertimeModule.schema = {

  enable: {
    type: 'boolean',
    default: false
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
  },

  speedModifier: {
    type: 'CurveRange',
    default: null
  },

  space: {
    type: 'enums',
    options: [
      'local',
      'world'
    ],
    default: 'local'
  }
};