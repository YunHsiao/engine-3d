// load level
window.load = function (baseUrl, sceneName, onLevelLoaded) {
  window.cc.resl({
    manifest: {
      gameInfo: {
        type: 'text',
        parser: JSON.parse,
        src: `${baseUrl}/game.json`
      }
    },

    onDone(data) {
      window.app.loadGameConfig(baseUrl, data.gameInfo);
      window.app.assets.loadLevel(sceneName, (err, level) => {
        if (err) {
          console.error(err);
        } else {
          window.app.loadLevel(level);
          if (onLevelLoaded) {
            onLevelLoaded();
          }
        }
      });
    }
  });
}