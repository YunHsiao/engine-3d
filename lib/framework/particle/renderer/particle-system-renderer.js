import renderer from '../../../renderer';
import { vec3, vec4, vec2, mat4 } from '../../../vmath';
import gfx from '../../../gfx';
import Material from '../../../assets/material';
import { RecyclePool } from '../../../memop';
import Particle from '../particle';

let _tempAttribUV = vec3.create();
let _tempAttribUV0 = vec2.create();
let _tempAttribColor = vec4.create();
let _tempWorldTrans = mat4.create();

let _uvs = [
  0, 0, // bottom-left
  1, 0, // bottom-right
  0, 1, // top-left
  1, 1  // top-right
];

export default class ParticleSystemRenderer {
  constructor() {
    this._model = null;

    this.frameTile = vec2.create(1, 1);
    this.attrs = new Array(5);
  }

  onInit(ps) {
    this._vertAttrs = [
      { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3, index: gfx.ATTR_INDEX_POSITION },
      { name: gfx.ATTR_UV, type: gfx.ATTR_TYPE_FLOAT32, num: 3, index: gfx.ATTR_INDEX_UV },
      { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2, index: gfx.ATTR_INDEX_UV0 },
      { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 4, index: gfx.ATTR_INDEX_COLOR }
    ];
    this._particles = new RecyclePool(() => {
      return new Particle(this);
    }, ps._capacity);
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
      this._model.setParticleRenderer(this);
      this._model.setNode(this.particleSystem._entity);
    }
    this._model.setEffect(this._material ? this._material.effectInst : null);
    if (Object.getPrototypeOf(this).constructor.name === 'ParticleSystemGpuRenderer')
      return;
    if (this._renderMode === 'stretchedBillboard') {
      this._model.enableStretchedBillboard();
    } else {
      this._model.disableStretchedBillboard();
    }
  }

  _getFreeParticle() {
    if (this._particles.length >= this.particleSystem._capacity)
      return null;
    return this._particles.add();
  }

  _setNewParticle(p) {

  }

  _updateParticles(dt) {
    this.particleSystem._entity.getWorldMatrix(_tempWorldTrans);
    if (this.particleSystem._velocityOvertimeModule.enable) {
      this.particleSystem._velocityOvertimeModule.update(this.particleSystem._simulationSpace, _tempWorldTrans);
    }
    if (this.particleSystem._forceOvertimeModule.enable) {
      this.particleSystem._forceOvertimeModule.update(this.particleSystem._simulationSpace, _tempWorldTrans);
    }
    for (let i = 0; i < this._particles.length; ++i) {
      let p = this._particles.data[i];
      p.remainingLifetime -= dt;
      vec3.set(p.animatedVelocity, 0, 0, 0);

      if (p.remainingLifetime < 0.0) {
        this._particles.remove(i);
        --i;
        continue;
      }

      p.velocity.y -= this.particleSystem._gravityModifier.evaluate(1 - p.remainingLifetime / p.startLifetime, p.randomSeed) * 9.8 * dt; // apply gravity.
      if (this.particleSystem._sizeOvertimeModule.enable) {
        this.particleSystem._sizeOvertimeModule.animate(p);
      }
      if (this.particleSystem._colorOverLifetimeModule.enable) {
        this.particleSystem._colorOverLifetimeModule.animate(p);
      }
      if (this.particleSystem._forceOvertimeModule.enable) {
        this.particleSystem._forceOvertimeModule.animate(p, dt);
      }
      if (this.particleSystem._velocityOvertimeModule.enable) {
        this.particleSystem._velocityOvertimeModule.animate(p);
      }
      else {
        vec3.copy(p.ultimateVelocity, p.velocity);
      }
      if (this.particleSystem._limitVelocityOvertimeModule.enable) {
        this.particleSystem._limitVelocityOvertimeModule.animate(p);
      }
      if (this.particleSystem._rotationOvertimeModule.enable) {
        this.particleSystem._rotationOvertimeModule.animate(p, dt);
      }
      if (this.particleSystem._textureAnimationModule.enable) {
        this.particleSystem._textureAnimationModule.animate(p);
      }
      vec3.scaleAndAdd(p.position, p.position, p.ultimateVelocity, dt); // apply velocity.
    }
  }

  // internal function
  _updateRenderData() {
    // update vertex buffer
    let idx = 0;
    let uploadVel = this._renderMode == 'stretchedBillboard';
    for (let i = 0; i < this._particles.length; ++i) {
      let p = this._particles.data[i];
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
    this._model.updateIA(this._particles.length * 6);
  }

  updateShaderUniform() {

  }
}

Object.assign(ParticleSystemRenderer, { uv: _uvs });

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
