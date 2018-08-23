import ParticleSystemRenderer from "./particle-system-renderer";
import Material from "../../../assets/material";
import Particle from "../particle";
import gfx from "../../../gfx";
import { CurveUniform } from "../animator/optimized-curve";
import { quat } from "../../../vmath";

let _temp_rot = quat.create();
let _world_rot_uniform = new Float32Array(4);

let _vert_attr_name = {
  POSITION_STARTTIME: 'a_position_starttime',
  VERT_IDX_SIZE_ANGLE: 'a_vertIdx_size_angle',
  COLOR: 'a_color',
  DIR_LIFE: 'a_dir_life'
};

let _gpu_vert_attr = [
  { name: _vert_attr_name.POSITION_STARTTIME, type: gfx.ATTR_TYPE_FLOAT32, num: 4 },
  { name: _vert_attr_name.VERT_IDX_SIZE_ANGLE, type: gfx.ATTR_TYPE_FLOAT32, num: 4 },
  { name: _vert_attr_name.COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 4 },
  { name: _vert_attr_name.DIR_LIFE, type: gfx.ATTR_TYPE_FLOAT32, num: 4 }
];

let _space_map = {
  'local': 0,
  'world': 1
};

let ATTR_INDEX = {
  POS: 0,
  VERT_IDX: 1,
  SIZE: 2,
  ANGLE: 3,
  COLOR: 4,
  DIR: 5,
  LIFE_TIME: 6,
  START_TIME: 7
};

export default class ParticleSystemGpuRenderer extends ParticleSystemRenderer {
  onInit(ps) {
    this.particleSystem = ps;
    if (this._material === null || this._material === undefined) {
      this._material = new Material();
      this._material.effect = ps._app.assets.get('builtin-effect-particle-premultiply-blend');
    }
    //the following code is just for test use,it will be deleted on release
    let m = new Material();
    m.copy(this._material);
    m.effect = ps._app.assets.get('builtin-effect-particle-add-gpu');
    Object.keys(this._material._props).forEach(pn => {
      m.setProperty(pn, this._material._props[pn]);
    });
    this._material = m;
    //end test code
    this._vertAttrs = _gpu_vert_attr;
    this._updateMaterialParams();
    this._updateModel();
    this._tempParticle = new Particle();
    this._particleNum = 0;
    this._vertIndexMap = new Int8Array(Object.keys(ATTR_INDEX).length);
    this._constructAttributeIndex();
  }

  _constructAttributeIndex() {
    let offset = 0;
    for (let i = 0; i < _gpu_vert_attr.length; i++) {
      switch (_gpu_vert_attr[i].name) {
        case _vert_attr_name.POSITION_STARTTIME:
          this._vertIndexMap[ATTR_INDEX.POS] = offset;
          this._vertIndexMap[ATTR_INDEX.START_TIME] = offset + 3;
          break;
        case _vert_attr_name.VERT_IDX_SIZE_ANGLE:
          this._vertIndexMap[ATTR_INDEX.VERT_IDX] = offset;
          this._vertIndexMap[ATTR_INDEX.SIZE] = offset + 2;
          this._vertIndexMap[ATTR_INDEX.ANGLE] = offset + 3;
          break;
        case _vert_attr_name.COLOR:
          this._vertIndexMap[ATTR_INDEX.COLOR] = offset;
          break;
        case _vert_attr_name.DIR_LIFE:
          this._vertIndexMap[ATTR_INDEX.DIR] = offset;
          this._vertIndexMap[ATTR_INDEX.LIFE_TIME] = offset + 3;
          break;
      }
      offset += _gpu_vert_attr[i].num;
    }
  }

  _getFreeParticle() {
    if (this._particleNum >= this.particleSystem._capacity) {
      return null;
    }
    return this._tempParticle;
  }

  _setNewParticle(p) {
    let offset = this._particleNum * this._model._vertAttrsSize * 4;
    for (let i = 0; i < 4; i++) {
      this._model._vdataF32[offset++] = p.position.x;
      this._model._vdataF32[offset++] = p.position.y;
      this._model._vdataF32[offset++] = p.position.z;
      this._model._vdataF32[offset++] = this.particleSystem._time;

      this._model._vdataF32[offset++] = this.constructor.uv[2 * i];
      this._model._vdataF32[offset++] = this.constructor.uv[2 * i + 1];
      this._model._vdataF32[offset++] = p.startSize.x;
      this._model._vdataF32[offset++] = p.rotation.x;

      this._model._vdataF32[offset++] = p.startColor.r;
      this._model._vdataF32[offset++] = p.startColor.g;
      this._model._vdataF32[offset++] = p.startColor.b;
      this._model._vdataF32[offset++] = p.startColor.a;

      this._model._vdataF32[offset++] = p.velocity.x;
      this._model._vdataF32[offset++] = p.velocity.y;
      this._model._vdataF32[offset++] = p.velocity.z;
      this._model._vdataF32[offset++] = p.startLifetime;
    }
    this._particleNum++;
  }

  _updateParticles() {
    for (let i = 0; i < this._particleNum; ++i) {
      let pBaseIndex = i * this._model._vertAttrsSize * 4;
      if (this.particleSystem._time - this._model._vdataF32[pBaseIndex + this._vertIndexMap[ATTR_INDEX.START_TIME]] > this._model._vdataF32[pBaseIndex + this._vertIndexMap[ATTR_INDEX.LIFE_TIME]]) {
        let lastParticleBaseIndex = (this._particleNum - 1) * this._model._vertAttrsSize * 4;
        this._model._vdataF32.copyWithin(pBaseIndex, lastParticleBaseIndex, lastParticleBaseIndex + this._model._vertAttrsSize * 4);
        i--;
        this._particleNum--;
      }
    }
  }

  _updateRenderData() {
    this._model.updateIA(this._particleNum * 6);
  }

  updateShaderUniform() {
    this._model._device.setUniform('u_psTime', this.particleSystem._time);
    let needUploadRot = false;
    if (this.particleSystem._velocityOvertimeModule.enable) {
      this._material.define('VELOCITY_OVERTIME_MODULE_ENABLE', true);
      if (this.velocity_x_uniform === undefined) {
        this.velocity_x_uniform = new CurveUniform();
        this.velocity_x_uniform.constructCurveIntegral(this.particleSystem._velocityOvertimeModule._x);
      }
      if (this.velocity_y_uniform === undefined) {
        this.velocity_y_uniform = new CurveUniform();
        this.velocity_y_uniform.constructCurveIntegral(this.particleSystem._velocityOvertimeModule._y);
      }
      if (this.velocity_z_uniform === undefined) {
        this.velocity_z_uniform = new CurveUniform();
        this.velocity_z_uniform.constructCurveIntegral(this.particleSystem._velocityOvertimeModule._z);
      }
      this.velocity_x_uniform.uploadUniform(this._model._device, 'velocity_x');
      this.velocity_y_uniform.uploadUniform(this._model._device, 'velocity_y');
      this.velocity_z_uniform.uploadUniform(this._model._device, 'velocity_z');
      this._model._device.setUniform('u_speedModifier', this.particleSystem._velocityOvertimeModule._speedModifier.evaluate());
      this._model._device.setUniform('u_velocity_space', _space_map[this.particleSystem._velocityOvertimeModule._space]);
      if (this.particleSystem._velocityOvertimeModule._space === 'local') {
        needUploadRot = true;
      }
    } else {
      this._material.define('VELOCITY_OVERTIME_MODULE_ENABLE', false);
    }
    if (this.particleSystem._forceOvertimeModule.enable) {
      this._material.define('FORCE_OVERTIME_MODULE_ENABLE', true);
      if (this.force_x_uniform === undefined) {
        this.force_x_uniform = new CurveUniform();
        this.force_x_uniform.constructCurveIntegralTwice(this.particleSystem._forceOvertimeModule._x);
      }
      if (this.force_y_uniform === undefined) {
        this.force_y_uniform = new CurveUniform();
        this.force_y_uniform.constructCurveIntegralTwice(this.particleSystem._forceOvertimeModule._y);
      }
      if (this.force_z_uniform === undefined) {
        this.force_z_uniform = new CurveUniform();
        this.force_z_uniform.constructCurveIntegralTwice(this.particleSystem._forceOvertimeModule._z);
      }
      this.force_x_uniform.uploadUniform(this._model._device, 'force_x');
      this.force_y_uniform.uploadUniform(this._model._device, 'force_y');
      this.force_z_uniform.uploadUniform(this._model._device, 'force_z');
      this._model._device.setUniform('u_force_space', _space_map[this.particleSystem._forceOvertimeModule._space]);
      if (this.particleSystem._forceOvertimeModule._space === 'local') {
        needUploadRot = true;
      }
    } else {
      this._material.define('FORCE_OVERTIME_MODULE_ENABLE', false);
    }
    if (needUploadRot) {
      quat.array(_world_rot_uniform, this.particleSystem._entity.getWorldRot(_temp_rot));
      this._model._device.setUniform('u_worldRot', _world_rot_uniform);
    }
  }
}