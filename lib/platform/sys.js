import enums from './enums';

function sysInit() {
  let sys = {};
  sys.isBrowser = _checkIsBrowser();
  sys.supportWebGL = _checkWebGLSupport();
  sys.isMobile = _checkMobile();
  // sys.audioSupport = _checkAudioSupport();
  let browserTypeAndVersion = _checkBrowserTypeAndVersion();
  sys.browserType = browserTypeAndVersion.browserType;
  sys.browserVersion = browserTypeAndVersion.browserVersion;
  return sys;

  // isBrowser
  function _checkIsBrowser() {
    return typeof window === 'object' && typeof document === 'object';
  }

  // todo: some platform may diff here
  function _createCanvas() {
    if (_checkIsBrowser()) {
      return document.createElement('canvas');
    } else {
      return null;
    }
  }

  // todo: some platform may diff here
  function _checkWebGLSupport() {
    let canvas = _createCanvas();
    if (canvas === null) {
      return false;
    } else {
      let webGLIDs = ['webgl', 'experimental-webgl'];
      let result = false;
      for (let i = 0; i < webGLIDs.length; ++i) {
        if (canvas.getContext(webGLIDs[i])) {
          return true;
        }
      }
      return result;
    }
  }

  // todo: some platform may diff here
  function _checkMobile() {
    if (!_checkIsBrowser()) {
      return false;
    } else {
      let nav = window.navigator;
      let ua = nav.userAgent.toLowerCase();
      return /mobile|android|iphone|ipad/.test(ua);
    }
  }

  function _checkBrowserTypeAndVersion() {
    if (typeof window === 'object') {
      let nav = window.navigator;
      let ua = nav.userAgent.toLowerCase();
      let typeReg1 = /mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|ucbs|360 aphone|360browser|baiduboxapp|baidubrowser|maxthon|mxbrowser|miuibrowser/i;
      let typeReg2 = /qqbrowser|ucbrowser/i;
      let typeReg3 = /chrome|safari|firefox|trident|opera|opr\/|oupeng/i;

      let versionReg1 = /(mqqbrowser|micromessenger|qq|sogou|qzone|liebao|maxthon|uc|ucbs|360 aphone|360|baiduboxapp|baidu|maxthon|mxbrowser|miui)(mobile)?(browser)?\/?([\d.]+)/i;
      let versionReg2 = /(qqbrowser|chrome|safari|firefox|trident|opera|opr\/|oupeng)(mobile)?(browser)?\/?([\d.]+)/i;
      let browserVersions = ua.match(versionReg1);
      if (!browserVersions) browserVersions = ua.match(versionReg2);
      let browserVersion = browserVersions ? browserVersions[4] : "";
      let browserTypes = typeReg1.exec(ua);
      if (!browserTypes) browserTypes = typeReg2.exec(ua);
      if (!browserTypes) browserTypes = typeReg3.exec(ua);
      let browserType = browserTypes ? browserTypes[0].toLowerCase() : enums.BROWSER_TYPE_UNKNOWN;
      if (browserType === 'micromessenger')
        browserType = enums.BROWSER_TYPE_WECHAT;
      else if (browserType === 'qq' && ua.match(/android.*applewebkit/i))
        browserType = enums.BROWSER_TYPE_ANDROID;
      else if (browserType === 'trident')
        browserType = enums.BROWSER_TYPE_IE;
      else if (browserType === '360 aphone')
        browserType = enums.BROWSER_TYPE_360;
      else if (browserType === 'mxbrowser')
        browserType = enums.BROWSER_TYPE_MAXTHON;
      else if (browserType === 'opr/')
        browserType = enums.BROWSER_TYPE_OPERA;
      else {
        browserType = enums.BROWSER_TYPE_UNKNOWN;
      }

      return { browserType, browserVersion };
    } else {
      let browserType = enums.BROWSER_TYPE_UNKNOWN;
      let browserVersion = '';
      return { browserType, browserVersion };
    }
  }
}

let _sys = sysInit();

export default {
  isBrowser: _sys.isBrowser,
  supportWebGL: _sys.supportWebGL,
  isMobile: _sys.isMobile,
  browserType: _sys.browserType,
  browserVersion: _sys.browserVersion,
};
