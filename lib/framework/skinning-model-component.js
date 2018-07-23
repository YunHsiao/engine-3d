import { mat4 } from '../vmath';
import ModelComponent from './model-component';
import renderer from '../renderer';
import utils from '../misc/utils';

let _m4_tmp = mat4.create();

export default class SkinningModelComponent extends ModelComponent {
  onInit() {
    this._models = [];
    // internal skinning data
    this._jointsTexture = null;
    this._jointsMatricesArray = [];
    this._refSkeleton = null;

    this._updateModels();
    this._updateCastShadow();
    this._updateReceiveShadow();

    let rootEnt = this._entity.parent;
    let animComp = rootEnt.getComp('Animation');
    if (animComp) {
      this._refSkeleton = animComp.skeleton;
    } else {
      console.warn('Can not find Animation component in root entity.');
    }

    this._system.add(this);
  }

  onDestroy() {
    this._system.remove(this);
  }

  _updateMatrices() {
    if (!this._mesh || !this._mesh.skinning) {
      return;
    }

    const jointIndices = this._mesh.skinning.jointIndices;
    const bindposes = this._mesh.skinning.bindposes;

    for (let i = 0; i < jointIndices.length; ++i) {
      let bindpose = bindposes[i];
      let idx = jointIndices[i];

      let worldMatrix = this._refSkeleton.getWorldMatrix(idx);
      mat4.multiply(_m4_tmp, worldMatrix, bindpose);

      this._setJointMatrix(i, _m4_tmp);
    }

    this._commitJointsData();
  }

  _updateModels() {
    if (this._mesh.skinning) {
      this._reInitJointsData();
    }

    let meshCount = this._mesh ? this._mesh.subMeshCount : 0;
    let oldModels = this._models;

    this._models = new Array(meshCount);
    for (let i = 0; i < meshCount; ++i) {
      let model = new renderer.SkinningModel();
      model.createBoundingBox(this._mesh._minPos, this._mesh._maxPos);
      this._models[i] = model;
    }

    this. _updateModelParams();

    if (this.enabled) {
      this._entity.emit('skinning-model-changed', this, 'mesh', oldModels);
    }
  }

  _updateModelParams() {
    super._updateModelParams();
    for (let i = 0; i < this._models.length; ++i)
      this._updateModelJointParam(this._models[i]);
  }

  _reInitJointsData() {
    if (this._jointsTexture) {
      this._jointsTexture.unload();
      this._jointsTexture = null;
    } else {
      this._jointsMatricesArray = [];
    }

    if (this._app.device.allowFloatTexture()) {
      this._jointsTexture = utils.createJointsTexture(
        this._app,
        this._mesh.skinning
      );
    } else {
      this._jointsMatricesArray = new Array(this._mesh.skinning.jointIndices.length);
      for (let i = 0; i < this._jointsMatricesArray.length; ++i) {
        this._jointsMatricesArray[i] = new Float32Array(16);
      }
    }
  }

  _commitJointsData() {
    const texture = this._jointsTexture;
    if (texture != null) {
      texture.commit();
    }
  }

  _updateModelJointParam(model) {
    const texture = this._jointsTexture;
    if (texture != null) {
      model.setJointsTexture(texture._texture);
    } else {
      model.setJointsMatrixArray(this._jointsMatricesArray);
    }
  }

  _setJointMatrix(iMatrix, matrix) {
    const texture = this._jointsTexture;
    if (texture != null) {
      texture.data[16 * iMatrix + 0]  = matrix.m00;
      texture.data[16 * iMatrix + 1]  = matrix.m01;
      texture.data[16 * iMatrix + 2]  = matrix.m02;
      texture.data[16 * iMatrix + 3]  = matrix.m03;
      texture.data[16 * iMatrix + 4]  = matrix.m04;
      texture.data[16 * iMatrix + 5]  = matrix.m05;
      texture.data[16 * iMatrix + 6]  = matrix.m06;
      texture.data[16 * iMatrix + 7]  = matrix.m07;
      texture.data[16 * iMatrix + 8]  = matrix.m08;
      texture.data[16 * iMatrix + 9]  = matrix.m09;
      texture.data[16 * iMatrix + 10] = matrix.m10;
      texture.data[16 * iMatrix + 11] = matrix.m11;
      texture.data[16 * iMatrix + 12] = matrix.m12;
      texture.data[16 * iMatrix + 13] = matrix.m13;
      texture.data[16 * iMatrix + 14] = matrix.m14;
      texture.data[16 * iMatrix + 15] = matrix.m15;
    } else {
      mat4.array(this._jointsMatricesArray[iMatrix], matrix);
    }
  }
}
