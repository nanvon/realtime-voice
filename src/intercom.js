/**
 * 实时语音喊话
 */
import Media from './media';
import Recorder from './recorder';

export class intercom {
  constructor(config) {
    this.config = config;
    this.url = config.url;
    this.ws = null;
    this.record = null;
    this.err = false; //记录网络错误或ws返回出错信息
    this._mediaStream = null;
  }
  init = (rec) => {
    this.record = rec;
  };
  startWs = (url, msgCallback, errCallback) => {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer'; //传输的是 ArrayBuffer 类型的数据
    this.ws.onopen = () => {
      console.log('语音喊话ws握手成功');
      if (this.ws.readyState == 1) {
        //ws进入连接状态，则每隔500毫秒发送一包数据
        this.record.start();
      }
    };

    //与后端约定：ws服务只会发送错误信息
    this.ws.onmessage = function (msg) {
      console.info(msg);
      msgCallback(msg.data);
    };

    this.ws.onerror = function (err) {
      console.info(err);
      errCallback('WebSocket连接错误');
    };
  };
  startSpeak = (errCb) => {
    let media = new Media();
    media
      .promiseStream()
      .then((mediaStream) => {
        this._mediaStream = mediaStream;
        let _recorder = new Recorder(mediaStream, this.config, (audioData) => {
          //对以获取的数据进行处理(分包)
          let reader = new FileReader();
          reader.onload = (e) => {
            let outBuffer = e.target.result;
            console.log('this.ws.readyState: ', this.ws.readyState);
            //1 (WebSocket.OPEN)已经链接并且可以通讯 才发送
            if (this.ws.readyState == 1) {
              this.ws.send(outBuffer);
            }

            //测试下载文件
            // var oA = document.createElement('a');
            // oA.href = window.URL.createObjectURL(new Blob([arr]));
            // console.log('oA.href: ', oA.href);
            // oA.download = oA.href.split('/')[3] + '.pcm';
            // oA.click();
          };
          reader.readAsArrayBuffer(audioData.encodePCM());
          audioData.clear(); //每次发送完成则清理掉旧数据
        });
        this.init(_recorder);
        this.startWs(
          this.url,
          (data) => {
            //接收到信息，代表后端中转WebSocket服务在请求语音喊话sever时出错所返回的信息
            alert(data);
            this.err = true;
            this.record.stop();
            this.ws.close();
            this._mediaStream.getTracks().forEach((track) => track.stop());
          },
          (data) => {
            //接收到信息，代表后端中转WebSocket服务在请求语音喊话sever时出错所返回的信息
            alert(data);
            this.err = true;
            this.record.stop();
            this.ws.close();
            this._mediaStream.getTracks().forEach((track) => track.stop());
          }
        );
      })
      .catch((msg) => {
        errCb(msg);
      });
  };
  stopSpeak = () => {
    if (this.ws) {
      this.record.stop();
      this.ws.close();
      this._mediaStream.getTracks().forEach((track) => track.stop());
      console.log('语音喊话ws关闭成功');
    }
  };
}
