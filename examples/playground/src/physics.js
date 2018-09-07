(() => {
  const { cc, app, dgui } = window;
  const { Material } = cc;
  const { vec3, quat, color4, randomRange } = cc.math;
  const { box, sphere } = cc.primitives;

  // geometries
  let box_mesh = cc.utils.createMesh(app, box());
  let sphere_mesh = cc.utils.createMesh(app, sphere());
  let models = [], colliders = [], colors = [];
  let box_color = color4.create(0.2, 0.7, 0.5, 1);
  let sphere_color = color4.create(0.8, 0.3, 0.5, 1);
  for (let i = 0; i < 200; i++) {
    let isBox = Math.random() < 0.5;
    let ent = app.createEntity((isBox ? 'box_' : 'sphere_') + i);
    ent.setLocalPos(randomRange(-2, 2), 3 + i * 2, randomRange(-2, 2));
    ent.setLocalRotFromEuler(randomRange(0, 180), randomRange(0, 180), randomRange(0, 180));
    let modelComp = ent.addComp('Model');
    let m = new Material();
    m.effect = app.assets.get('builtin-effect-phong');
    let c = isBox ? color4.clone(box_color) : color4.clone(sphere_color);
    m.setProperty('diffuseColor', c);
    modelComp.mesh = isBox ? box_mesh : sphere_mesh;
    modelComp.material = m;
    // default collider size matches default primitive accordingly, no need to set here
    let col = ent.addComp('Collider', { type: isBox ? 'box' : 'sphere', mass: 1 });
    models.push(modelComp); colliders.push(col); colors.push(c);
  }
  let radius = 12.5;
  let ground = app.createEntity('ground');
  ground.setLocalPos(0, 1, 0);
  ground.setLocalScale(radius * 2, 2, radius * 2);
  let modelComp = ground.addComp('Model');
  let m = new Material();
  m.effect = app.assets.get('builtin-effect-phong');
  m.setProperty('diffuseColor', color4.create(0.2, 0.3, 0.5, 1));
  modelComp.mesh = cc.utils.createMesh(app, box());
  modelComp.material = m;
  let col = ground.addComp('Collider');
  // col.body._setDataflowPushing();

  // camera
  let camEnt = app.createEntity('camera');
  camEnt.setLocalPos(25, 15, 25);
  camEnt.lookAt(vec3.create(0, 5, 0));
  camEnt.addComp('Camera');

  // light
  let light = app.createEntity('light');
  light.setLocalRotFromEuler(-80, 20, -40);
  light.addComp('Light');

  let static_color = color4.create(0.3, 0.3, 0.3, 1);
  app.on('tick', () => {
    for (let i = 0; i < models.length; i++) {
      // handle bounds
      if      (colliders[i].body.position.y <         -10) colliders[i].body.position.y =  30;
      else if (colliders[i].body.position.x >  (radius+3)) colliders[i].body.position.x = -(radius-3);
      else if (colliders[i].body.position.x < -(radius+3)) colliders[i].body.position.x =  (radius-3);
      else if (colliders[i].body.position.z >  (radius+3)) colliders[i].body.position.z = -(radius-3);
      else if (colliders[i].body.position.z < -(radius+3)) colliders[i].body.position.z =  (radius-3);
      // visualize speed
      let speed = vec3.magnitude(colliders[i].body.velocity); speed /= speed + 1;
      color4.lerp(colors[i], static_color, colliders[i].type === 'box' ?
        box_color : sphere_color, speed);
    }
  });

  // controllers
  let dobj = {
    gravityX: 0,
    gravityY: -20,
    gravityZ: 0,
    pauseSpinning: false,
    angle: 180
  };
  let updateGravity = function() {
    vec3.set(app.system('physics').world.gravity, dobj.gravityX, dobj.gravityY, dobj.gravityZ);
  };
  let setGroundRotation = col.body._dataflow === 'pushing' ? function(x, y, z) {
    quat.fromEuler(col.body.quaternion, x, y, z);
  } : function(x, y, z) {
    ground.setLocalRotFromEuler(x, y, z);
  };
  updateGravity();
  dgui.remember(dobj);
  dgui.add(dobj, 'gravityX', -20, 20).onFinishChange(updateGravity);
  dgui.add(dobj, 'gravityY', -20, 20).onFinishChange(updateGravity);
  dgui.add(dobj, 'gravityZ', -20, 20).onFinishChange(updateGravity);
  let angleControl = dgui.add(dobj, 'angle', 0, 180).listen();
  let setActive = () => {
    angleControl.domElement.style.pointerEvents = dobj.pauseSpinning ? "all" : "none";
    angleControl.domElement.style.opacity = dobj.pauseSpinning ? 1.0 : 0.3;
  };
  setActive();
  dgui.add(dobj, 'pauseSpinning').onFinishChange(setActive);
  app.on('tick', () => { // user controller callback
    if (!dobj.pauseSpinning) return;
    setGroundRotation(0, 0, dobj.angle);
  });
  // spin the ground once in a while
  let duration = 5, interval = 20, startTime = app.totalTime, back = false;
  let sineLerp = (b, e, t) => {
    return b + (e - b) * (Math.sin((t - 0.5) * Math.PI) + 1) * 0.5;
  };
  let spinning = () => {
    if (dobj.pauseSpinning) return;
    dobj.angle = sineLerp(back ? 0 : 180, back ? 180 : 0,
      (app.totalTime - startTime) / duration);
    setGroundRotation(0, 0, dobj.angle);
  };
  let begin = () => {
    startTime = app.totalTime;
    app.on('tick', spinning);
  };
  setTimeout(() => {
    begin();
    setInterval(begin, (interval + duration) * 1000);
  }, interval * 1000);
  setInterval(() => {
    app.off('tick', spinning);
    back = !back;
  }, (interval + duration) * 1000);
})();