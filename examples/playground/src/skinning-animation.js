(() => {
  const { cc, app, dgui } = window;
  const { resl } = cc;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    entityPath: 'Hero',
    animationclips: [],
    movementSpeed : 0.0,
    isHealth: true
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

            let charFolder = dgui.addFolder("Character");

            let mainEntity = app.find(dobj.entityPath);
            let mainEntityAnimation = mainEntity.getComp('Animation');

            let clips = [];
            for (let clip of mainEntityAnimation.clips)
              clips.push(clip.name);
              charFolder.add(dobj, 'animationclips', clips).name("Clips").onFinishChange((value) => {
              mainEntityAnimation.play(value);
            });

            // The animation clips.
            let idleClip = mainEntityAnimation.getState("Idle").clip;
            let walkClip = mainEntityAnimation.getState("WalkForward").clip;
            let runClip = mainEntityAnimation.getState("RunForward").clip;
            let deathClip = mainEntityAnimation.getState("ShootDown").clip;

            // Blend idle, Walk and run clip together to describe the character movement.
            // It's a blend tree.
            let blender = new cc.animation.AnimationBlender1D();
            blender.setSamples([
              new cc.animation.BlendItem1D(idleClip, 0),
              new cc.animation.BlendItem1D(walkClip, 1),
              new cc.animation.BlendItem1D(runClip, 2),
            ]);
            blender.setInput(0);
            let blendTree = new cc.animation.BlendTree(blender);

            // Setup the motions and add them to animation graph.
            // Movement motion is the blended animation.
            let movementMotion = new cc.animation.Motion("Movement", blendTree);
            mainEntityAnimation.animationGraph.addMotion(movementMotion);
            // Death motion is just a single animation clip.
            let deathMotion = new cc.animation.Motion("Death", deathClip);
            deathMotion.wrapMode = 'once';
            mainEntityAnimation.animationGraph.addMotion(deathMotion);

            // Setup the transitions between these motions.
            // The "isHealth" parameter with type boolean is used to indicate whether
            // the character is health. Is so, let it doing the movement motion, death motion instead. 
            let isHealth = mainEntityAnimation.animationGraph.createParameter("IsHealth", "boolean");
            isHealth.value = true; // By default, the character is health.
            let death = movementMotion.makeTransitionTo(deathMotion);
            death.addCondition(new cc.animation.Condition(isHealth, 'equal', false));
            let reborn = deathMotion.makeTransitionTo(movementMotion);
            reborn.addCondition(new cc.animation.Condition(isHealth, 'equal', true));

            charFolder.add(dobj, "movementSpeed", 0.0, 2.0).name("Speed").onFinishChange((value) => {
              mainEntityAnimation.animationGraph.linearSwitch(movementMotion);
              blender.setInput(value);
            });

            charFolder.add(dobj, "isHealth", true).name("Health").onFinishChange((value) => {
              isHealth.value = value;
            });
          }
        });

      }
    });
  }
})();
