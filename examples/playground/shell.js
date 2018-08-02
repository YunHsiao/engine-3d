'use strict';

(() => {
  const { cc, dat } = window;

  function _loadPromise(url) {
    return new Promise((resolve, reject) => {
      let xhr = new window.XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = onreadystatechange;
      xhr.send(null);

      function onreadystatechange(e) {
        if (xhr.readyState !== 4) {
          return;
        }

        // Testing harness file:/// results in 0.
        if ([0, 200, 304].indexOf(xhr.status) === -1) {
          reject(`While loading from url ${url} server responded with a status of ${xhr.status}`);
        } else {
          resolve(e.target.response);
        }
      }
    });
  }

  function _load(view, url, orientation) {
    if (window.reqID) {
      window.cancelAnimationFrame(window.reqID);
    }

    _loadPromise(url).then(result => {
      // destroy old instances
      if (view.firstElementChild) {
        view.firstElementChild.remove();
      }

      if (window.app) {
        window.app.destroy();
        window.app = null;
      }

      if (window.dgui) {
        window.dgui.destroy();
        window.dgui = null;
      }

      // create new canvas
      let canvas = document.createElement('canvas');
      canvas.classList.add('fit');
      canvas.tabIndex = -1;
      view.appendChild(canvas);

      // init app
      let app = new cc.App(canvas);
      app.view.setOrientation(orientation);
      app.on('tick', () => {
        window.stats.update();
      });
      window.app = app;

      // init dgui
      let dgui = new dat.GUI({ width: 270 });
      dgui.domElement.classList.add('dgui');
      window.dgui = dgui;

      // init example modules
      eval(`${result}\n//# sourceURL=${url}`);

      // start debugger
      if (localStorage.getItem('engine.enableDebugger') === 'true') {
        app.debugger.start();
      }

      //
      app.run();

    }).catch(err => {
      console.error(err);
    });
  }

  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'complete') {
      return;
    }

    let view = document.getElementById('view');
    let showFPS = document.getElementById('showFPS');
    let enableDebugger = document.getElementById('debugger');
    let enableSpector = document.getElementById('spector');
    let exampleList = document.getElementById('exampleList');
    let orientationOps = document.getElementById('orientationOps');

    // update profile
    showFPS.checked = localStorage.getItem('engine.showFPS') === 'true';
    enableDebugger.checked = localStorage.getItem('engine.enableDebugger') === 'true';
    enableSpector.checked = localStorage.getItem('engine.enableSpector') === 'true';
    let exampleIndex = parseInt(localStorage.getItem('engine.exampleIndex'));
    if (isNaN(exampleIndex)) {
      exampleIndex = 0;
    }
    exampleList.selectedIndex = exampleIndex;

    // init lstats
    let stats = new window.Stats();
    showFPS.checked ? stats.dom.style.display = 'block' : stats.dom.style.display = 'none';
    stats.dom.style.cssText = 'position:fixed;top:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild(stats.dom);
    window.stats = stats;

    // init spector
    if (enableSpector.checked) {
      let url = '../node_modules/spectorjs/dist/spector.bundle.js';
      _loadPromise(url).then(result => {
        eval(`${result}\n//# sourceURL=${url}`);
        let spector = new window.SPECTOR.Spector();
        spector.displayUI();
      });
    }

    _load(view, exampleList.value);

    showFPS.addEventListener('click', event => {
      localStorage.setItem('engine.showFPS', event.target.checked);
      if (event.target.checked) {
        stats.dom.style.display = 'block';
      } else {
        stats.dom.style.display = 'none';
      }
    });

    enableDebugger.addEventListener('click', event => {
      localStorage.setItem('engine.enableDebugger', event.target.checked);

      if (event.target.checked) {
        window.app.debugger.start();
      } else {
        window.app.debugger.stop();
      }
    });

    enableSpector.addEventListener('click', event => {
      localStorage.setItem('engine.enableSpector', event.target.checked);
    });
    let orienMap = {
      Auto: cc.ORIENTATION_AUTO,
      Landscape: cc.ORIENTATION_LANDSCAPE,
      Portrait: cc.ORIENTATION_PORTRAIT,
    };
    orientationOps.addEventListener('change', event => {
      window.app && window.app.view.setOrientation(orienMap[orientationOps.value] || cc.ORIENTATION_AUTO);
    });
    exampleList.addEventListener('change', event => {
      localStorage.setItem('engine.exampleIndex', event.target.selectedIndex);
      _load(view, exampleList.value, orienMap[orientationOps.value] || cc.ORIENTATION_AUTO);
    });
  });
})();