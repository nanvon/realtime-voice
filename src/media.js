//获取浏览器录音权限
class Media {
  constructor() {
    this._constraints = {
      audio: true,
      video: false,
    };
    let oldUserMedia = function (constraints) {
      let getUserMedia =
        navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));//可能原因有：浏览器不支持、网址不是https 等等
      }
      return new Promise(function (res, rej) {
        getUserMedia.call(navigator, constraints, res, rej);
      });
    };
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = oldUserMedia;
    }
  }
  promiseStream() {
    let pm = new Promise((res, rej) => {
      let msg = '';
      navigator.mediaDevices
        .getUserMedia(this._constraints)
        .then((stream) => {
          res(stream);
        })
        .catch((error) => {
          switch (error.message || error.name) {
            case 'PERMISSION_DENIED':
            case 'PermissionDeniedError':
            case 'Permission denied':
            case 'Permission dismissed':
              msg = '用户拒绝提供录音信息。';
              break;
            case 'NOT_SUPPORTED_ERROR':
            case 'NotSupportedError':
              msg = '浏览器不支持硬件设备。';
              break;
            case 'MANDATORY_UNSATISFIED_ERROR':
            case 'MandatoryUnsatisfiedError':
              msg = '无法发现指定的硬件设备。';
              break;
            default:
              msg = `无法打开麦克风。异常信息：${error.message}`;
              break;
          }
          // rej({ error, msg });
          rej(msg);
        });
    });
    return pm;
  }
}

export default Media;
