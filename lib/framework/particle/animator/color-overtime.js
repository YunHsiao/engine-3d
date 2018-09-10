import { color4, pseudoRandom } from '../../../vmath';

const COLOR_OVERTIME_RAND_OFFSET = 91041;

export default class ColorOvertimeModule {
  animate(particle) {
    if (this._enable) {
      color4.multiply(particle.color, particle.startColor, this._color.evaluate(1.0 - particle.remainingLifetime / particle.startLifetime, pseudoRandom(particle.randomSeed + COLOR_OVERTIME_RAND_OFFSET)));
    }
  }
}

ColorOvertimeModule.schema = {
  enable: {
    type: 'boolean',
    default: false
  },

  color: {
    type: 'GradientRange',
    default: null
  }
};