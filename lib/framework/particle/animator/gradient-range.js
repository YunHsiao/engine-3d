import { color4, lerp } from '../../../vmath';

const GRADIENT_MODE_FIX = 0;
const GRADIENT_MODE_BLEND = 1;

const GRADIENT_RANGE_MODE_COLOR = 0;
const GRADIENT_RANGE_MODE_TWO_COLOR = 1;
const GRADIENT_RANGE_MODE_RANDOM_COLOR = 2;
const GRADIENT_RANGE_MODE_GRADIENT = 3;
const GRADIENT_RANGE_MODE_TWO_GRADIENT = 4;

export default class GradientRange {

  evaluate(time, rndRatio) {
    switch (this._mode) {
      case 'color':
        return this._color;
      case 'twoColors':
        return color4.set(this._color, lerp(this._colorMin.r, this._colorMax.r, rndRatio), lerp(this._colorMin.g, this._colorMax.g, rndRatio), lerp(this._colorMin.b, this._colorMax.b, rndRatio), lerp(this._colorMin.a, this._colorMax.a, rndRatio));
      case 'randomColor':
        return this._gradient.randomColor();
      case 'gradient':
        return this._gradient.evaluate(time);
      case 'twoGradients':
        this._colorMin = this._gradientMin.evaluate(time);
        this._colorMax = this._gradientMax.evaluate(time);
        return color4.set(this._color, lerp(this._colorMin.r, this._colorMax.r, rndRatio), lerp(this._colorMin.g, this._colorMax.g, rndRatio), lerp(this._colorMin.b, this._colorMax.b, rndRatio), lerp(this._colorMin.a, this._colorMax.a, rndRatio));
    }
  }
}

GradientRange.schema = {
  mode: {
    type: 'enums',
    default: 'color',
    options: [
      'color',
      'gradient',
      'twoColors',
      'twoGradients',
      'randomColor'
    ]
  },

  color: {
    type: 'color4',
    default: [1, 1, 1, 1]
  },

  colorMin: {
    type: 'color4',
    default: [1, 1, 1, 1]
  },

  colorMax: {
    type: 'color4',
    default: [1, 1, 1, 1]
  },

  gradient: {
    type: 'Gradient',
    default: null
  },

  gradientMin: {
    type: 'Gradient',
    default: null
  },

  gradientMax: {
    type: 'Gradient',
    default: null
  }
};

export class GradientUniform {
  constructor(gr) {
    this.gr = gr;
    if (gr._mode == 'color') {
      this.minColor = new Float32Array(4);
      color4.array(this.minColor, gr._color);
    } else if (gr._mode == 'twoColors') {
      this.minColor = new Float32Array(4);
      this.maxColor = new Float32Array(4);
      color4.array(this.minColor, gr._colorMin);
      color4.array(this.maxColor, gr._colorMax);
    } else if (gr._mode == 'gradient') {
      this.minColorKeyTime = new Float32Array(gr._gradient._colorKeys.length);
      this.minColorKeyValue = new Float32Array(3 * this.minColorKeyTime.length);
      this.minAlphaKeyTime = new Float32Array(gr._gradient._alphaKeys.length);
      this.minAlphaKeyValue = new Float32Array(this.minAlphaKeyTime.length);
      this.constructor.generateGradientUniform(gr._gradient, this.minColorKeyTime, this.minColorKeyValue, this.minAlphaKeyTime, this.minAlphaKeyValue);
    } else if (gr._mode == 'twoGradients') {
      this.minColorKeyTime = new Float32Array(gr._gradientMin._colorKeys.length);
      this.minColorKeyValue = new Float32Array(3 * this.minColorKeyTime.length);
      this.minAlphaKeyTime = new Float32Array(gr._gradientMin._alphaKeys.length);
      this.minAlphaKeyValue = new Float32Array(this.minAlphaKeyTime.length);
      this.constructor.generateGradientUniform(gr._gradientMin, this.minColorKeyTime, this.minColorKeyValue, this.minAlphaKeyTime, this.minAlphaKeyValue);
      this.maxColorKeyTime = new Float32Array(gr._gradientMax._colorKeys.length);
      this.maxColorKeyValue = new Float32Array(3 * this.maxColorKeyTime.length);
      this.maxAlphaKeyTime = new Float32Array(gr._gradientMax._alphaKeys.length);
      this.maxAlphaKeyValue = new Float32Array(this.maxAlphaKeyTime.length);
      this.constructor.generateGradientUniform(gr._gradientMax, this.maxColorKeyTime, this.maxColorKeyValue, this.maxAlphaKeyTime, this.maxAlphaKeyValue);
    }
  }

  uploadUniform(device, name) {
    if (this.gr._mode == 'color') {
      device.setUniform('u_' + name + '_rangeMode', GRADIENT_RANGE_MODE_COLOR);
      device.setUniform('u_' + name + '_minColor', this.minColor);
    } else if (this.gr._mode == 'twoColors') {
      device.setUniform('u_' + name + '_rangeMode', GRADIENT_RANGE_MODE_TWO_COLOR);
      device.setUniform('u_' + name + '_minColor', this.minColor);
      device.setUniform('u_' + name + '_maxColor', this.maxColor);
    } else if (this.gr._mode == 'gradient') {
      device.setUniform('u_' + name + '_rangeMode', GRADIENT_RANGE_MODE_GRADIENT);
      device.setUniform('u_' + name + '_minGradMode', this.gr._gradient._mode === 'blend' ? GRADIENT_MODE_BLEND : GRADIENT_MODE_FIX);
      device.setUniform('u_' + name + '_minColorKeyValue', this.minColorKeyValue);
      device.setUniform('u_' + name + '_minColorKeyTime', this.minColorKeyTime);
      device.setUniform('u_' + name + '_minAlphaKeyValue', this.minAlphaKeyValue);
      device.setUniform('u_' + name + '_minAlphaKeyTime', this.minAlphaKeyTime);
    } else if (this.gr._mode == 'twoGradients') {
      device.setUniform('u_' + name + '_rangeMode', GRADIENT_RANGE_MODE_TWO_GRADIENT);
      device.setUniform('u_' + name + '_minGradMode', this.gr._gradientMin._mode === 'blend' ? GRADIENT_MODE_BLEND : GRADIENT_MODE_FIX);
      device.setUniform('u_' + name + '_minColorKeyValue', this.minColorKeyValue);
      device.setUniform('u_' + name + '_minColorKeyTime', this.minColorKeyTime);
      device.setUniform('u_' + name + '_minAlphaKeyValue', this.minAlphaKeyValue);
      device.setUniform('u_' + name + '_minAlphaKeyTime', this.minAlphaKeyTime);

      device.setUniform('u_' + name + '_maxGradMode', this.gr._gradientMax._mode === 'blend' ? GRADIENT_MODE_BLEND : GRADIENT_MODE_FIX);
      device.setUniform('u_' + name + '_maxColorKeyValue', this.maxColorKeyValue);
      device.setUniform('u_' + name + '_maxColorKeyTime', this.maxColorKeyTime);
      device.setUniform('u_' + name + '_maxAlphaKeyValue', this.maxAlphaKeyValue);
      device.setUniform('u_' + name + '_maxAlphaKeyTime', this.maxAlphaKeyTime);
    }
  }

  static generateGradientUniform(gradient, colorKeyTime, colorKeyValue, alphaKeyTime, alphaKeyValue) {
    for (let i = 0; i < gradient._colorKeys.length; i++) {
      colorKeyTime[i] = gradient._colorKeys[i]._time;
      colorKeyValue[i * 3] = gradient._colorKeys[i]._color.r;
      colorKeyValue[i * 3 + 1] = gradient._colorKeys[i]._color.g;
      colorKeyValue[i * 3 + 2] = gradient._colorKeys[i]._color.b;
    }
    for (let i = 0; i < gradient._alphaKeys.length; i++) {
      alphaKeyTime[i] = gradient._alphaKeys[i]._time;
      alphaKeyValue[i] = gradient._alphaKeys[i]._alpha;
    }
  }
}