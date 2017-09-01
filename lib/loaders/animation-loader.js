import gltfUtils from './utils/gltf-utils';
import resl from '../misc/resl';

export default function (app, urls, callback) {
  resl({
    manifest: {
      gltf: {
        type: 'text',
        parser: JSON.parse,
        src: urls.gltf,
      },
      bin: {
        type: 'binary',
        src: urls.bin
      }
    },

    onDone(data) {
      const { gltf, bin } = data;

      if (!gltf.animations.length) {
        callback(new Error('No animation in the gltf.'));
        return;
      }

      let animClip = gltfUtils.createAnimationClip(gltf, bin, 0);
      callback(null, animClip);
    }
  });
}