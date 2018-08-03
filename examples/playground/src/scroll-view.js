(() => {
  const { cc, app } = window;
  const { vec3, color4 } = cc.math;

  let camEnt = app.createEntity('camera');
  vec3.set(camEnt.lpos, 10, 10, 10);
  camEnt.lookAt(vec3.new(0, 0, 0));
  camEnt.addComp('Camera');

  let screen = app.createEntity('screen');
  screen.addComp('Widget');
  screen.addComp('Screen');

  // 220x220
  let entity = app.createEntity('scrollView');
  entity.setParent(screen);
  let scrollWidgetComp = entity.addComp('Widget');
  scrollWidgetComp.setSize(220, 220);
  let scrollSprite = entity.addComp('Image');
  scrollSprite.color = color4.new(1, 1, 1, 0.5);
  let scrollView = entity.addComp('ScrollView');

  // 200x200
  let view = app.createEntity('view');
  view.setParent(entity);
  let maskWidgetComp = view.addComp('Widget');
  maskWidgetComp.setAnchors(0, 0, 1, 1);
  maskWidgetComp.setSize(-20, -20);
  maskWidgetComp.setOffset(-10, 10);
  let viewMask = view.addComp('Mask');
  viewMask.color = color4.new(1, 0, 1, 0.5);

  // 300x400
  let content = app.createEntity('content');
  content.setParent(view);
  let contentWidgetComp = content.addComp('Widget');
  contentWidgetComp.setSize(300, 400);
  contentWidgetComp.setPivot(1, 1);
  contentWidgetComp.setOffset(100, 100);
  let contentSprite = content.addComp('Image');
  contentSprite.color = color4.new(0.8, 0.8, 0.8, 1);

  let temp = app.createEntity('temp');
  temp.setParent(content);
  let tempWidget = temp.addComp('Widget');
  tempWidget.setSize(50, 50);
  let tempSprite = temp.addComp('Image');
  tempSprite.color = color4.new(1, 1, 0, 1);

  // 20x200
  let vScrollBarEnt = app.createEntity('vScrollBar');
  vScrollBarEnt.setParent(entity);
  // ent.setWorldRot(rot);
  let vScrollWidget = vScrollBarEnt.addComp('Widget');
  vScrollWidget.setAnchors(1, 0, 1, 1);
  vScrollWidget.setSize(20, -20);
  vScrollWidget.setOffset(-10, 10);
  let vScrollBarSprite = vScrollBarEnt.addComp('Image');
  vScrollBarSprite.color = color4.new(1, 1, 1, 1);
  let vScrollBar = vScrollBarEnt.addComp('ScrollBar');

  let vScrollBarArea = app.createEntity('vScrollBarArea');
  vScrollBarArea.setParent(vScrollBarEnt);
  let vScrollBarAreaWidget = vScrollBarArea.addComp('Widget');
  vScrollBarAreaWidget.setAnchors(0, 0, 1, 1);
  vScrollBarAreaWidget.setSize(-20, -20);

  let vScrollBarHandle = app.createEntity('vScrollBarHandle');
  vScrollBarHandle.setParent(vScrollBarArea);
  let vScrollBarWidgetComp = vScrollBarHandle.addComp('Widget');
  vScrollBarWidgetComp.setAnchors(0, 1, 1, 1);
  vScrollBarWidgetComp.setSize(20, 20);
  let vScrollBarHandleSprite = vScrollBarHandle.addComp('Image');
  vScrollBarHandleSprite.color = color4.new(0, 1, 1, 1);

  vScrollBar.background = vScrollBarHandleSprite;
  vScrollBar.transition = 'color';
  vScrollBar.transitionColors.normal = color4.new(0, 1, 1, 1);
  vScrollBar.transitionColors.highlight = color4.new(1, 1, 0, 1);
  vScrollBar.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
  vScrollBar.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
  vScrollBar._updateState();

  vScrollBar.dragArea = screen;
  vScrollBar.handle = vScrollBarHandle;
  vScrollBar.direction = 'vertical';
  vScrollBar.reverse = true;
  // vScrollBar.scrollPos = 0.3;

  let hScrollBarEnt = app.createEntity('hScrollBar');
  hScrollBarEnt.setParent(entity);
  // ent.setWorldRot(rot);
  let hScrollBarWidget = hScrollBarEnt.addComp('Widget');
  hScrollBarWidget.setAnchors(0, 0, 1, 0);
  hScrollBarWidget.setSize(-20, 20);
  hScrollBarWidget.setOffset(-10, 10);
  let hScrollBarSprite = hScrollBarEnt.addComp('Image');
  hScrollBarSprite.color = color4.new(1, 1, 1, 1);
  let hScrollBar = hScrollBarEnt.addComp('ScrollBar');

  let hScrollBarArea = app.createEntity('hScrollBarArea');
  hScrollBarArea.setParent(hScrollBarEnt);
  let hScrollBarAreaWidget = hScrollBarArea.addComp('Widget');
  hScrollBarAreaWidget.setAnchors(0, 0, 1, 1);
  hScrollBarAreaWidget.setSize(-20, -20);

  let hScrollBarHandle = app.createEntity('hScrollBarHandle');
  hScrollBarHandle.setParent(hScrollBarArea);
  let hScrollBarHandleWidget = hScrollBarHandle.addComp('Widget');
  hScrollBarHandleWidget.setAnchors(0, 0, 0, 1);
  hScrollBarHandleWidget.setSize(20, 20);
  let hScrollBarHandleSprite = hScrollBarHandle.addComp('Image');
  hScrollBarHandleSprite.color = color4.new(0, 1, 1, 1);
  hScrollBar.background = hScrollBarHandleSprite;
  hScrollBar.transition = 'color';
  hScrollBar.transitionColors.normal = color4.new(0, 1, 1, 1);
  hScrollBar.transitionColors.highlight = color4.new(1, 1, 0, 1);
  hScrollBar.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
  hScrollBar.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
  hScrollBar._updateState();

  hScrollBar.dragArea = screen;
  hScrollBar.handle = hScrollBarHandle;
  hScrollBar.direction = 'horizontal';

  scrollView.content = content;
  scrollView.viewPort = view;
  scrollView.movementType = 'elastic';
  scrollView.vScrollBar = vScrollBarEnt;
  scrollView.hScrollBar = hScrollBarEnt;
})();