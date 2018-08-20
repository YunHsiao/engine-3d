(() => {
  const { app, cc, dgui } = window;
  const { vec3, color4, randomRange } = cc.math;

  let dobj = {
    maxObj: 100,
    material: 'unlit'
  };
  dgui.add(dobj, 'maxObj', 0, 200).step(1).onChange(updateObjs);
  dgui.add(dobj, 'material', ['unlit', 'phong', 'pbr']).onFinishChange(() => {
    for (let i = 0; i < ents.length; i++) {
      ents[i].getComp('Model').material = mats[dobj.material];
    }
  });

  let ents = [];
  function updateObjs(val) {
    let len = ents.length;
    let delta = parseInt(val) - len;

    // models
    if (delta > 0) {
      for (let i = 0; i < delta; ++i) {
        let ent = app.createEntity(`node_${i}`);
        ent.setLocalPos(
          randomRange(-50, 50),
          randomRange(-10, 10),
          randomRange(-50, 50)
        );
        ent.setLocalRotFromEuler(
          randomRange(0, 360),
          randomRange(0, 360),
          randomRange(0, 360)
        );
        ent.setLocalScale(
          randomRange(1, 5),
          randomRange(1, 5),
          randomRange(1, 5)
        );

        let modelComp = ent.addComp('Model');
        modelComp.mesh = meshBox;
        modelComp.material = mats[dobj.material];

        ents.push(ent);
      }
    } else {
      for (let i = 0; i < -delta; ++i) {
        ents[len - i - 1].destroy();
      }
      ents.length = val;
    }
  }

  // create mesh
  let meshBox = cc.utils.createMesh(app, cc.primitives.box(1, 1, 1, {
    widthSegments: 1,
    heightSegments: 1,
    lengthSegments: 1,
  }));

  // create material
  let mats = {};
  mats.unlit = new cc.Material();
  mats.unlit.effect = app.assets.get('builtin-effect-unlit-transparent');
  mats.unlit.define('USE_COLOR', true);
  mats.unlit.define('USE_TEXTURE', true);
  mats.unlit.setProperty('color', color4.create(1, 1, 1, 0.6));

  mats.phong = new cc.Material();
  mats.phong.effect = app.assets.get('builtin-effect-phong-transparent');
  mats.phong.define('USE_DIFFUSE_TEXTURE', true);
  mats.phong.setProperty('diffuseColor', color4.create(1, 1, 1, 0.6));

  mats.pbr = new cc.Material();
  mats.pbr.effect = app.assets.get('builtin-effect-pbr-transparent');
  mats.pbr.define('USE_ALBEDO_TEXTURE', true);
  mats.pbr.setProperty('albedo', color4.create(1, 1, 1, 0.6));
  mats.pbr.setProperty('ao', 1);

  app.assets.loadUrls('texture', {
    image: '../assets/textures/checker_uv.jpg'
  }, (err, texture) => {
    mats.unlit.setProperty('mainTexture', texture);
    mats.phong.setProperty('diffuse_texture', texture);
    mats.pbr.setProperty('albedo_texture', texture);
  });

  // create camera
  let camEnt = app.createEntity('camera');
  camEnt.setLocalPos(10, 10, 10);
  camEnt.lookAt(vec3.create(0, 0, 0));
  camEnt.addComp('Camera');

  updateObjs(dobj.maxObj);
})();