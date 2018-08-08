(() => {
  const { cc, app } = window;
  const { vec3, quat, color4 } = cc.math;

  let camEnt = app.createEntity('camera');
  vec3.set(camEnt.lpos, 10, 10, 10);
  camEnt.lookAt(vec3.new(0, 0, 0));
  camEnt.addComp('Camera');

  let screen = app.createEntity('screen');
  screen.addComp('Widget');
  screen.addComp('Screen');

  let rotation = quat.create();
  quat.fromEuler(rotation, 0, 0, 60);
  // toggle horizontal
  {
    let sliderEnt = app.createEntity('slider');
    sliderEnt.setParent(screen);
    let sliderWidget = sliderEnt.addComp('Widget');
    sliderWidget.setOffset(-100, 0);
    sliderWidget.setSize(160, 20);
    sliderEnt.setWorldRot(rotation);
    let sliderComp = sliderEnt.addComp('Slider');
    sliderComp.direction = 'horizontal';

    let sliderBg = app.createEntity('bg');
    sliderBg.setParent(sliderEnt);
    let bgWidgetComp = sliderBg.addComp('Widget');
    bgWidgetComp.setAnchors(0, 0, 1, 1);
    bgWidgetComp.setSize(0, 0);
    sliderBg.addComp('Image');

    let fillArea = app.createEntity('fillArea');
    fillArea.setParent(sliderEnt);
    let faWidget = fillArea.addComp('Widget');
    faWidget.setAnchors(0, 0, 1, 1);
    faWidget.setSize(-20, 0);
    faWidget.setOffset(-5, 0);

    let fill = app.createEntity('fill');
    fill.setParent(fillArea);
    let fillWidgetComp = fill.addComp('Widget');
    fillWidgetComp.setAnchors(0, 0, 0, 1);
    fillWidgetComp.setSize(10, 0);
    let fillImageComp = fill.addComp('Image');
    fillImageComp.color = color4.new(1, 0, 0, 1);

    let handleArea = app.createEntity('handleArea');
    handleArea.setParent(sliderEnt);
    let haWidget = handleArea.addComp('Widget');
    haWidget.setAnchors(0, 0, 1, 1);
    haWidget.setSize(-20, 0);

    let handle = app.createEntity('handle');
    handle.setParent(handleArea);
    let handleWidgetComp = handle.addComp('Widget');
    handleWidgetComp.setAnchors(0, 0, 0, 1);
    handleWidgetComp.setSize(20, 20);
    let handleImageComp = handle.addComp('Image');
    handleImageComp.color = color4.new(0, 1, 1, 1);
    sliderComp.background = handle;
    sliderComp.transition = 'color';
    sliderComp.transitionColors.normal = color4.new(0, 1, 1, 1);
    sliderComp.transitionColors.highlight = color4.new(1, 1, 0, 1);
    sliderComp.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
    sliderComp.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
    sliderComp._updateState();

    sliderComp.handle = handle;
    sliderComp.fill = fill;
  }

  // toggle vertical
  {
    let sliderEnt = app.createEntity('slider');
    sliderEnt.setParent(screen);
    let sliderWidget = sliderEnt.addComp('Widget');
    sliderWidget.setOffset(200, 0);
    sliderWidget.setSize(20, 160);
    sliderEnt.setWorldRot(rotation);
    let sliderComp = sliderEnt.addComp('Slider');
    sliderComp.direction = 'vertical';

    let sliderBg = app.createEntity('bg');
    sliderBg.setParent(sliderEnt);
    let bgWidgetComp = sliderBg.addComp('Widget');
    bgWidgetComp.setAnchors(0, 0, 1, 1);
    bgWidgetComp.setSize(0, 0);
    let bgImageComp = sliderBg.addComp('Image');
    bgImageComp.color = color4.new(1, 1, 1, 1);

    let fillArea = app.createEntity('fillArea');
    fillArea.setParent(sliderEnt);
    let faWidget = fillArea.addComp('Widget');
    faWidget.setAnchors(0, 0, 1, 1);
    faWidget.setSize(0, -20);
    faWidget.setOffset(0, -5);

    let fill = app.createEntity('fill');
    fill.setParent(fillArea);
    let fillWidgetComp = fill.addComp('Widget');
    fillWidgetComp.setAnchors(0, 0, 1, 0);
    fillWidgetComp.setSize(0, 10);
    let fillImageComp = fill.addComp('Image');
    fillImageComp.color = color4.new(1, 0, 0, 1);

    let handleArea = app.createEntity('handleArea');
    handleArea.setParent(sliderEnt);
    let haWidget = handleArea.addComp('Widget');
    haWidget.setAnchors(0, 0, 1, 1);
    haWidget.setSize(0, -20);

    let handle = app.createEntity('handle');
    handle.setParent(handleArea);
    let handleWidgetComp = handle.addComp('Widget');
    handleWidgetComp.setAnchors(0, 0, 1, 0);
    handleWidgetComp.setSize(20, 20);
    let handleImageComp= handle.addComp('Image');
    handleImageComp.color = color4.new(0, 1, 1, 1);

    sliderComp.background = handle;
    sliderComp.transition = 'color';
    sliderComp.transitionColors.normal = color4.new(0, 1, 1, 1);
    sliderComp.transitionColors.highlight = color4.new(1, 1, 0, 1);
    sliderComp.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
    sliderComp.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
    sliderComp._updateState();

    sliderComp.handle = handle;
    sliderComp.fill = fill;
    sliderComp.reverse = true;
    sliderComp.progress = 0.3;
  }
})();