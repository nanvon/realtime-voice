/**
 * 实时语音对讲
 */
import Media from './media';
import Recorder from './recorder';
import { RtpPacket } from './rtppacket';
import * as alaw from './alaw';

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
    const _size = 546;
    let media = new Media();
    media
      .promiseStream()
      .then((mediaStream) => {
        let _recorder = new Recorder(mediaStream, this.config, (audioData) => {
          //对以获取的数据进行处理(分包)
          let reader = new FileReader();
          reader.onload = (e) => {
            let outBuffer = e.target.result;
            let arr = new Int16Array(outBuffer);
            console.log('arr: ', arr);

            let aLawSamples = alaw.encode(arr);
            console.log('aLawSamples: ', aLawSamples);
            // console.log('arr: ', arr);
            const rtp = new RtpPacket(aLawSamples);
            rtp.time += aLawSamples.length;
            rtp.seq++;
            this.ws.send(rtp.packet);
            // console.log('rtp.packet: ', rtp.packet);

            //测试下载文件
            // var oA = document.createElement('a');
            // let aLawSamples = alaw.encode(arr);
            // oA.href = window.URL.createObjectURL(new Blob([aLawSamples]));
            // console.log('oA.href: ', oA.href);
            // oA.download = oA.href.split('/')[3] + '.g711a';
            // oA.click();

            //分包-现将bufferSize调小，不进行分包，以免产生较大延时
            // if (arr.length > 0) {
            //   let tmpArr = new Int16Array(_size); //_size字节
            //   let j = 0;
            //   for (let i = 0; i < arr.byteLength; i++) {
            //     tmpArr[j++] = arr[i];
            //     if ((i + 1) % _size == 0) {
            //       let aLawSamples = alaw.encode(tmpArr);
            //       console.log('aLawSamples: ', aLawSamples);
            //       console.log('tmpArr: ', tmpArr);
            //       const rtp = new RtpPacket(aLawSamples);
            //       rtp.time += aLawSamples.length;
            //       rtp.seq++;
            //       this.ws.send(rtp.packet);
            //       // console.log('rtp.packet: ', rtp.packet);
            //       if (arr.byteLength - i - 1 >= _size) {
            //         tmpArr = new Int16Array(_size);
            //       } else {
            //         tmpArr = new Int16Array(arr.byteLength - i - 1);
            //       }
            //       j = 0;
            //     }
            //     if (i + 1 == arr.byteLength && (i + 1) % _size != 0) {
            //       let aLawSamples = alaw.encode(tmpArr);
            //       const rtp = new RtpPacket(aLawSamples);
            //       rtp.time += aLawSamples.length;
            //       rtp.seq++;
            //       this.ws.send(rtp.packet);
            //       // console.log('rtp.packet: ', rtp.packet);
            //     }
            //   }
            // }
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
