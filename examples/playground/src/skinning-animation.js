(() => {
  const { cc, app, dgui } = window;
  const { resl } = cc;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    animationclips: [],
    speed: 1.0,
    animatables: []
  };

  dgui.remember(dobj);
  dgui.add(dobj, 'baseUrl').name("Base URL").onFinishChange(() => load());
  dgui.add(dobj, 'scene').name("Scene").onFinishChange(() => load());

  load();

  function load() {
    resl({
      manifest: {
        gameInfo: {
          type: 'text',
          parser: JSON.parse,
          src: `${dobj.baseUrl}/game.json`
        }
      },

      onDone(data) {
        app.loadGameConfig(`${dobj.baseUrl}`, data.gameInfo);
        app.assets.loadLevel(`${dobj.scene}`, (err, level) => {
          if (err) {
            console.error(err);
          } else {
            app.loadLevel(level);

            let animatableEntities = app.findEntitiesOfWithComponent('Animation');
            for (let entity of animatableEntities) {
              let folder = dgui.addFolder(entity.name);

              let object = {
                clips: [],
                speed: 1.0
              };

              let animationComponent = entity.getComp('Animation');

              let clips = [];
              for (let clip of animationComponent.clips)
                clips.push(clip.name);

              folder.add(object, 'clips', clips).name("Clips").onFinishChange((value) => {
                animationComponent.play(value);
              });

              folder.add(object, 'speed', 0.0, 4.0).name("Speed").onChange(() => {
                if (animationComponent._animCtrl._current) {
                  animationComponent._animCtrl._current.speed = dobj.speed;
                }
              });
            }
          }
        });
      }
    });
  }
})();