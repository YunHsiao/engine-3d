import renderer from '../../../renderer';
import { vec3, vec4, vec2 } from '../../../vmath';
import gfx from '../../../gfx';
import Material from '../../../assets/material';

let _tempAttribUV = vec3.zero();
let _tempAttribUV0 = vec2.zero();
let _tempAttribColor = vec4.zero();

let _name2VertAttrs = {
  'position': { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
  'uv': { name: gfx.ATTR_UV, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
  'uv0': { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 }, // size, rotateAngle
  'color': { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 4 },
  'normal': { name: gfx.ATTR_NORMAL, type: gfx.ATTR_TYPE_FLOAT32, num: 3 }, // 3D only
  'tangent': { name: gfx.ATTR_TANGENT, type: gfx.ATTR_TYPE_FLOAT32, num: 3 }, // 3D only
  'custom1': { name: gfx.ATTR_UV1, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
  'custom2': { name: gfx.ATTR_UV2, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
};

let _uvs = [
  0, 0, // bottom-left
  1, 0, // bottom-right
  0, 1, // top-left
  1, 1  // top-right
];

export default class ParticleSystemRenderer {
  constructor() {
    this._model = null;

    this._vertAttrs = [];
    this._vertAttrs = [
      { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3, index: gfx.ATTR_INDEX_POSITION },
      { name: gfx.ATTR_UV, type: gfx.ATTR_TYPE_FLOAT32, num: 3, index: gfx.ATTR_INDEX_UV },
      { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2, index: gfx.ATTR_INDEX_UV0 },
      { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 4, index: gfx.ATTR_INDEX_COLOR }
    ];
    this.frameTile = vec2.new(1, 1);
    this.attrs = new Array(5);
  }

  setVertexAtrributes(attrs) {
    for (let i = 0; i < attrs.length; ++i) {
      let attr = _name2VertAttrs[attrs[i]];
      if (attr !== undefined) {
        this._vertAttrs.push(attr);
      } else {
        console.error('vertex attribute name wrong.');
      }
    }
    this._model.setVertexAttributes(this._vertAttrs);
  }

  onInit(ps) {
    this.particleSystem = ps;
    if (this._material === null || this._material === undefined) {
      this._material = new Material();
      this._material.effect = ps._app.assets.get('builtin-effect-particle-premultiply-blend');
    }
    this._updateMaterialParams();
    this._updateModel();
  }

  _updateMaterialParams() {
    if (!this.particleSystem) {
      return;
    }
    if (this.particleSystem._simulationSpace === 'world') {
      this._material.define('USE_WORLD_SPACE', true);
    } else {
      this._material.define('USE_WORLD_SPACE', false);
    }

    if (this._renderMode === 'billboard') {
      this._material.define('USE_BILLBOARD', true);
      this._material.define('USE_STRETCHED_BILLBOARD', false);
      this._material.define('USE_HORIZONTAL_BILLBOARD', false);
      this._material.define('USE_VERTICAL_BILLBOARD', false);
    } else if (this._renderMode === 'stretchedBillboard') {
      this._material.define('USE_BILLBOARD', false);
      this._material.define('USE_STRETCHED_BILLBOARD', true);
      this._material.define('USE_HORIZONTAL_BILLBOARD', false);
      this._material.define('USE_VERTICAL_BILLBOARD', false);
      this._material.setProperty('velocityScale', this._velocityScale);
      this._material.setProperty('lengthScale', this._lengthScale);
    } else if (this._renderMode === 'horizontalBillboard') {
      this._material.define('USE_BILLBOARD', false);
      this._material.define('USE_STRETCHED_BILLBOARD', false);
      this._material.define('USE_HORIZONTAL_BILLBOARD', true);
      this._material.define('USE_VERTICAL_BILLBOARD', false);
    } else if (this._renderMode === 'verticalBillboard') {
      this._material.define('USE_BILLBOARD', false);
      this._material.define('USE_STRETCHED_BILLBOARD', false);
      this._material.define('USE_HORIZONTAL_BILLBOARD', false);
      this._material.define('USE_VERTICAL_BILLBOARD', true);
    } else {
      console.warn(`particle system renderMode ${this._renderMode} not support.`);
    }

    if (this.particleSystem.textureAnimationModule.enable) {
      this._material.setProperty('frameTile', vec2.set(this.frameTile, this.particleSystem.textureAnimationModule.numTilesX, this.particleSystem.textureAnimationModule.numTilesY));
    }
    else {
      this._material.setProperty('frameTile', this.frameTile);
    }
  }

  _updateModel() {
    if (!this.particleSystem) {
      return;
    }
    if (this._model === null) {
      this._model = new renderer.ParticleBatchModel(this.particleSystem._app.device, this.particleSystem._capacity, this._vertAttrs);
      this._model.setNode(this.particleSystem._entity);
    }
    this._model.setEffect(this._material ? this._material.effectInst : null);
    if (this._renderMode === 'stretchedBillboard') {
      this._model.enableStretchedBillboard();
    } else {
      this._model.disableStretchedBillboard();
    }
  }

  // internal function
  _updateRenderData() {
    // update vertex buffer
    let idx = 0;
    let uploadVel = this._renderMode == 'stretchedBillboard';
    for (let i = 0; i < this.particleSystem._particles.length; ++i) {
      let p = this.particleSystem._particles.data[i];
      let fi = 0;
      if (this.particleSystem._textureAnimationModule.enable) {
        fi = p.frameIndex;
      }
      idx = i * 4;
      let attrNum = 0;
      for (let j = 0; j < 4; ++j) { // four verts per particle.
        attrNum = 0;
        this.attrs[attrNum++] = p.position;
        _tempAttribUV.x = _uvs[2 * j];
        _tempAttribUV.y = _uvs[2 * j + 1];
        _tempAttribUV.z = fi;
        this.attrs[attrNum++] = _tempAttribUV;
        _tempAttribUV0.x = p.size.x;
        _tempAttribUV0.y = p.rotation.x;
        this.attrs[attrNum++] = _tempAttribUV0;
        _tempAttribColor.x = p.color.r;
        _tempAttribColor.y = p.color.g;
        _tempAttribColor.z = p.color.b;
        _tempAttribColor.w = p.color.a;
        this.attrs[attrNum++] = _tempAttribColor;

        if (uploadVel) {
          this.attrs[attrNum++] = p.ultimateVelocity;
        }

        this._model.addParticleVertexData(idx++, this.attrs);
      }
    }

    // because we use index buffer, per particle index count = 6.
    this._model.updateIA(this.particleSystem._particles.length * 6);
  }
}

ParticleSystemRenderer.schema = {
  material: {
    type: 'asset',
    default: null,
    set(val) {
      if (this._material === val) {
        return;
      }

      this._material = val;
      this._updateMaterialParams();
      this._updateModel();
    },
    parse(app, value) {
      if (typeof value === 'string') {
        let matCopy = new Material();
        matCopy.copy(app.assets.get(value));
        return matCopy;
      }
      return value;
    }
  },

  renderMode: {
    type: 'enums',
    default: 'billboard',
    options: [
      'billboard',
      'stretchedBillboard',
      'horizontalBillboard',
      'verticalBillboard',
      'mesh', // TODO:
    ],
    set(val) {
      if (this._renderMode === val) {
        return;
      }
      this._renderMode = val;
      this._updateMaterialParams();
      this._updateModel();
    }
  },

  velocityScale: {
    type: 'number',
    default: 1.0,
    set(val) {
      this._velocityScale = val;
      this._updateMaterialParams();
      this._updateModel();
    }
  },

  lengthScale: {
    type: 'number',
    default: 0.4,
    set(val) {
      this._lengthScale = val;
      this._updateMaterialParams();
      this._updateModel();
    }
  }
};
