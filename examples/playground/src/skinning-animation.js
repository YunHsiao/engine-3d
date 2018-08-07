(() => {
  const { cc, app, dgui } = window;
  const { resl } = cc;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    entityPath: 'Hero',
    animationclips: [],
    speed: 1.0,
  };

  dgui.remember(dobj);
  dgui.add(dobj, 'baseUrl').name("Base URL").onFinishChange(() => load());
  dgui.add(dobj, 'scene').name("Scene").onFinishChange(() => load());
  dgui.add(dobj, 'entityPath').name("Entity path");

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

            let mainEntity = app.find(dobj.entityPath);
            let mainEntityAnimation = mainEntity.getComp('Animation');

            let clips = [];
            for (let clip of mainEntityAnimation.clips)
              clips.push(clip.name);
            dgui.add(dobj, 'animationclips', clips).name("Clips").onFinishChange((value) => {
              mainEntityAnimation.play(value);
            });

            dgui.add(dobj, 'speed', 0.0, 4.0).name("Speed").onChange(() => {
              if (mainEntityAnimation._animCtrl._current) {
                mainEntityAnimation._animCtrl._current.speed = dobj.speed;
              }
            });
          }
        });
      }
    });
  }
})();