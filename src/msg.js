/**
 * 语音喊话
*/
import Media from './media';
import Recorder from './recorder';

export class msg {
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
        let _recorder = new Recorder(mediaStream, this.config, (audioData) => { });
        this.init(_recorder);
        this.startWs(this.url);
      })
      .catch((msg) => {
        errCb(msg);
      });
  };
  stopSpeak = () => {
    if (this.ws) {
      let reader = new FileReader();
      reader.onload = (e) => {
        let outBuffer = e.target.result;
        let arr = new Int8Array(outBuffer);
        this.ws.send(arr);
        this.record.stop();
        this.ws.close();
        console.log('ws关闭成功');
      };
      reader.readAsArrayBuffer(this.record.getBlob());
    }
  };
  downloadPCM = () => {
    if (this.record === null) return console.error('请先开始录音');
    var oA = document.createElement('a');
    oA.href = window.URL.createObjectURL(this.record.getBlob());
    console.log('oA.href: ', oA.href);
    oA.download = oA.href.split('/')[3] + '.pcm';
    oA.click();

    this.ws.close();
    this.record.stop();
  }
  downloadWAV = () => {
    if (this.record === null) return console.error('请先开始录音');
    var oA = document.createElement('a');
    oA.href = window.URL.createObjectURL(this.record.getWav());
    console.log('oA.href: ', oA.href);
    oA.download = oA.href.split('/')[3] + '.wav';
    oA.click();

    this.ws.close();
    this.record.stop();
  }
}
