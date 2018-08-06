import resl from '../misc/resl';
import PhysicsMaterial from '../framework/physics/material';

function createPhysicsMaterial(json) {
  let phsicsMaterialAsset = new PhysicsMaterial();

  phsicsMaterialAsset.friction = json.friction;
  phsicsMaterialAsset.bounciness = json.bounciness;

  return phsicsMaterialAsset;
}

export default function (app, urls, callback) {
  resl({
    manifest: {
      json: {
        type: 'text',
        parser: JSON.parse,
        src: urls.json,
      }
    },

    onDone(data) {
      const { json } = data;
      let phsicsMaterialAsset = createPhysicsMaterial(json);
      callback(null, phsicsMaterialAsset);
    }
  });
}
