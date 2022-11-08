/**
 * 实时语音对讲
 */
import Media from './media';
import Recorder from './recorder';

export class intercom {
  constructor(config) {
    this.config = config;
    this.url = config.url;
    this.ws = null;
    this.record = null;
  }
  init = (rec) => {
    this.record = rec;
  };
  startWs = (url) => {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer'; //传输的是 ArrayBuffer 类型的数据
    this.ws.onopen = () => {
      console.log('ws握手成功');
      if (this.ws.readyState == 1) {
        //ws进入连接状态，则每隔500毫秒发送一包数据
        this.record.start();
      }
    };

    this.ws.onmessage = function (msg) {
      console.info(msg);
    };

    this.ws.onerror = function (err) {
      console.info(err);
    };
  };
  startSpeak = (errCb) => {
    let media = new Media();
    media
      .promiseStream()
      .then((mediaStream) => {
        let _recorder = new Recorder(mediaStream, this.config, (audioData) => {
          //对以获取的数据进行处理(分包)
          let reader = new FileReader();
          reader.onload = (e) => {
            let outBuffer = e.target.result;
            let arr = new Int8Array(outBuffer);
            if (arr.length > 0) {
              let tmpArr = new Int8Array(1024); //1024字节
              let j = 0;
              for (let i = 0; i < arr.byteLength; i++) {
                tmpArr[j++] = arr[i];
                if ((i + 1) % 1024 == 0) {
                  this.ws.send(tmpArr);
                  if (arr.byteLength - i - 1 >= 1024) {
                    tmpArr = new Int8Array(1024);
                  } else {
                    tmpArr = new Int8Array(arr.byteLength - i - 1);
                  }
                  j = 0;
                }
                if (i + 1 == arr.byteLength && (i + 1) % 1024 != 0) {
                  this.ws.send(tmpArr);
                }
              }
            }
          };
          reader.readAsArrayBuffer(audioData.encodePCM());
          audioData.clear(); //每次发送完成则清理掉旧数据
        });
        this.init(_recorder);
        this.startWs(this.url);
      })
      .catch((msg) => {
        errCb(msg);
      });
  };
  stopSpeak = () => {
    if (this.ws) {
      this.record.stop();
      this.ws.close();
      console.log('ws关闭成功');
    }
  };
}