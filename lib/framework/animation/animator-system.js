import { System } from '../../ecs';
import { FixedArray } from '../../memop';
import findSkeleton from './utils';

export default class AnimatorSystem extends System {
  constructor() {
    super();

    this._anims = new FixedArray(200);
  }

  add(comp) {
    this._anims.push(comp);
  }

  remove(comp) {
    for (let i = 0; i < this._anims.length; ++i) {
      let c = this._anims.data[i];
      if (c === comp) {
        this._anims.fastRemove(i);
        break;
      }
    }
  }

  tick() {
    for (let i = 0; i < this._anims.length; ++i) {
      let anim = this._anims.data[i];
      if (!anim.enabled) {
        continue;
      }
      if (!anim.skeleton) {
        // console.error(`Animator component depends on skinning model component.`);
        let skeleton = findSkeleton(anim._entity);
        anim.skeleton = skeleton;
      }
      if (anim.skeleton) {
        anim.update(this._app.deltaTime);
      }
    }
  }
}