import WebAudioClip from '../assets/web-audio-clip';
import DOMAudioClip from '../assets/dom-audio-clip';
import sys from '../platform/sys';
import resl from '../misc/resl';

/**
 * Load the audio resource at the specified URL
 * @param {App} app the global app instance
 * @param {Obejct} urls URLs where the resource is located
 * @param {string} urls.bin the URL of the actual audio file
 * @param {?string} urls.json the URL of the JSON file specifying the audio params
 * @param {function(e:Error, c:AudioClip)} callback the callback after resource loaded or failed
 */
export default function (app, urls, callback) {
  let manifest = {};
  manifest.bin = {
    // If WebAudio is not supported, load using DOM mode
    type: sys.supportWebAudio ? 'binary' : 'audio',
    src: urls.bin
  };
  if (urls.json) manifest.json = {
    type: 'text',
    parser: JSON.parse,
    src: urls.json,
  };
  resl({
    manifest,
    onError: callback,
    onDone(data) {
      const { json, bin } = data;

      if (sys.supportWebAudio) {
        // Web Audio API still needs decoding
        let context = app.system('audio').context;
        context.decodeAudioData(bin, (buffer) => {
          let clip = new WebAudioClip(context, app);
          clip.setNativeAsset(buffer, json);
          callback(null, clip);
        }, (e) => {
          callback(new Error(e.err));
        });
      } else {
        let clip = new DOMAudioClip();
        clip.setNativeAsset(bin, json);
        callback(null, clip);
      }
    }
  });
}
