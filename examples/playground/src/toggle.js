(() => {
  const { cc, app } = window;
  const { vec3, color3, color4, quat } = cc.math;

  let camEnt = app.createEntity('camera');
  camEnt.setLocalPos(10, 10, 10);
  camEnt.lookAt(vec3.create(0, 0, 0));
  camEnt.addComp('Camera');

  let screen = app.createEntity('screen');
  screen.addComp('Widget');
  screen.addComp('Screen');

  // toggle1 (simple)
  {
    let ent = app.createEntity('toggle');
    ent.setParent(screen);
    let widget = ent.addComp('Widget');
    widget.setOffset(0, 50);
    widget.setSize(40, 40);
    ent.addComp('Image');
    let toggle = ent.addComp('Toggle');
    toggle.transition = 'color';
    toggle.transitionColors.normal = color4.create(0.8, 0.8, 0.8, 1);
    toggle.transitionColors.highlight = color4.create(1, 1, 0, 1);
    toggle.transitionColors.pressed = color4.create(0.5, 0.5, 0.5, 1);
    toggle.transitionColors.disabled = color4.create(0.2, 0.2, 0.2, 1);

    let checker = app.createEntity('checker');
    checker.setParent(ent);
    let checkerWidgetComp = checker.addComp('Widget');
    checkerWidgetComp.setAnchors(0, 0, 1, 1);
    checkerWidgetComp.setSize(-10, -10);
    let checkerImageComp = checker.addComp('Image');
    checkerImageComp._color = color4.create(1, 0, 0, 1);

    toggle.background = ent;
    toggle.checker = checker;
    toggle._updateState();
  }

  // toggle2 (with text)
  {
    let entToggle = app.createEntity('toggle-02');
    entToggle.setParent(screen);
    let widget = entToggle.addComp('Widget');
    widget.setOffset(0, -50);
    widget.setSize(200, 40);
    let toggle = entToggle.addComp('Toggle');
    toggle.transition = 'color';
    toggle.transitionColors.normal = color4.create(0.8, 0.8, 0.8, 1);
    toggle.transitionColors.highlight = color4.create(1, 1, 0, 1);
    toggle.transitionColors.pressed = color4.create(0.5, 0.5, 0.5, 1);
    toggle.transitionColors.disabled = color4.create(0.2, 0.2, 0.2, 1);

    let entBG = app.createEntity('background');
    entBG.setParent(entToggle);
    let bgWidget = entBG.addComp('Widget');
    bgWidget.setAnchors(0, 1, 0, 1);
    bgWidget.setOffset(30, 0);
    bgWidget.setSize(40, 40);
    entBG.addComp('Image');

    let entChecker = app.createEntity('checker');
    entChecker.setParent(entBG);
    let checkerWidgetComp = entChecker.addComp('Widget');
    checkerWidgetComp.setAnchors(0, 0, 1, 1);
    checkerWidgetComp.setSize(-10, -10);
    let checkerImageComp = entChecker.addComp('Image');
    checkerImageComp._color = color4.create(1, 0, 0, 1);

    let entLabel = app.createEntity('label');
    entLabel.setParent(entToggle);
    let labelWidgetComp = entLabel.addComp('Widget');
    labelWidgetComp.setAnchors(0, 1, 0, 1);
    labelWidgetComp.setOffset(110, 0);
    labelWidgetComp.setSize(100, 30);
    let textComp = entLabel.addComp('Text');
    textComp.text = 'Foobar';
    textComp.color = color4.create(0.1, 0.1, 0.1, 1);
    textComp.align = 'middle-center';

    //
    toggle.background = entBG;
    toggle.checker = entChecker;
    toggle._updateState();
  }

  // DEBUG
  app.on('tick', () => {
    cc.utils.walk(screen, ent => {
      let color = color3.create(0, 0, 0);
      let a = vec3.create(0, 0, 0);
      let b = vec3.create(0, 0, 0);
      let c = vec3.create(0, 0, 0);
      let d = vec3.create(0, 0, 0);
      let wpos = vec3.create(0, 0, 0);
      let wrot = quat.create();

      let widget = ent.getComp('Widget');
      widget.getWorldCorners(a, b, c, d);

      // rect
      app.debugger.drawLine2D(a, b, color);
      app.debugger.drawLine2D(b, c, color);
      app.debugger.drawLine2D(c, d, color);
      app.debugger.drawLine2D(d, a, color);

      app.debugger.drawAxes2D(
        ent.getWorldPos(wpos),
        ent.getWorldRot(wrot),
        5.0
      );
    });
  });
})();