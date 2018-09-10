import { vec3, pseudoRandom } from '../../../vmath';

const SIZE_OVERTIME_RAND_OFFSET = 39825;

export default class SizeOvertimeModule {

  animate(particle) {
    if (!this._separateAxes) {
      vec3.scale(particle.size, particle.startSize, this._size.evaluate(1 - particle.remainingLifetime / particle.startLifetime, pseudoRandom(particle.randomSeed + SIZE_OVERTIME_RAND_OFFSET)));
    }
  }
}

SizeOvertimeModule.schema = {
  enable: {
    type: 'boolean',
    default: false
  },

  separateAxes: {
    type: 'boolean',
    default: false
  },

  size: {
    type: 'CurveRange',
    default: null
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