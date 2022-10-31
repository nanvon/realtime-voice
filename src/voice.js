/**
 * 语音对讲
 * 使用：
import { speak, stop } from '@/utils/voice/index'

const start = () => {
  const config = {
    url: 'ws://localhost:1111/socketTest'
  }
  speak(config, (err) => {
    console.log('err: ', err);
    ElMessage.error(err)
  })
}
const close = () => {
  stop()
}
 */

import Media from './media';

let ws = null; //实现WebSocket
let record = null; //多媒体对象，用来处理音频

function init(rec) {
  record = rec;
}

//录音对象
let Recorder = function (stream) {
  let sampleBits = 16; //输出采样数位 8, 16
  let sampleRate = 8000; //输出采样率
  let context = new AudioContext(); //首先new一个AudioContext对象，作为声源的载体
  let audioInput = context.createMediaStreamSource(stream); //将声音输入这个对像，stream 就是上面返回音源
  /**
   * createScriptProcessor 创建声音的缓存节点
   * 第一个参数为缓存区大小，该取值控制着 audioprocess 事件被分派的频率，以及每一次调用多少样本帧被处理,
   * 一般数值为1024, 2048, 4096, 8192, 16384，这里选用4096。
   * 第二个和第三个参数指的是输入和输出的声道数
   */
  let recorder = context.createScriptProcessor(4096, 1, 1);
  // 对音频信号进行处理
  let audioData = {
    size: 0, //录音文件长度
    buffer: [], //录音缓存
    inputSampleRate: 48000, //输入采样率
    inputSampleBits: 16, //输入采样数位 8, 16
    outputSampleRate: sampleRate, //输出采样数位
    outputSampleBits: sampleBits, //输出采样率
    clear: function () {
      this.buffer = [];
      this.size = 0;
    },
    input: function (data) {
      this.buffer.push(new Float32Array(data));
      this.size += data.length;
    },
    // 将收到的音频信号进行预处理，即将二维数组转成一维数组，并且对音频信号进行降采样
    compress: function () {
      //合并
      let data = new Float32Array(this.size);
      let offset = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        data.set(this.buffer[i], offset);
        offset += this.buffer[i].length;
      }
      //压缩：即降采样，采取每interval长度取一个信号点的方式
      let compression = parseInt(this.inputSampleRate / this.outputSampleRate);
      let length = data.length / compression;
      let result = new Float32Array(length);
      let index = 0,
        j = 0;
      while (index < length) {
        result[index] = data[j];
        j += compression;
        index++;
      }
      return result;
    },
    encodePCM: function () {
      //这里不对采集到的数据进行其他格式处理，如有需要均交给服务器端处理。
      //得到格式为pcm,采样率为16k,位深为16bit的音频文件
      let sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
      let sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
      let bytes = this.compress();
      let dataLength = bytes.length * (sampleBits / 8);
      let buffer = new ArrayBuffer(dataLength);
      let data = new DataView(buffer);
      let offset = 0;
      // 将音频信号转为16bit位深
      for (let i = 0; i < bytes.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, bytes[i]));
        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      return new Blob([data]);
    },
  };

  let sendData = function () {
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
            ws.send(tmpArr);
            console.log('tmpArr: ', tmpArr);
            if (arr.byteLength - i - 1 >= 1024) {
              tmpArr = new Int8Array(1024);
            } else {
              tmpArr = new Int8Array(arr.byteLength - i - 1);
            }
            j = 0;
          }
          if (i + 1 == arr.byteLength && (i + 1) % 1024 != 0) {
            ws.send(tmpArr);
            console.log('tmpArr: ', tmpArr);
          }
        }
      }
    };
    reader.readAsArrayBuffer(audioData.encodePCM());
    audioData.clear(); //每次发送完成则清理掉旧数据
  };

  this.start = function () {
    audioInput.connect(recorder);
    recorder.connect(context.destination);
  };

  this.stop = function () {
    recorder.disconnect();
  };

  this.getBlob = function () {
    return audioData.encodePCM();
  };

  this.clear = function () {
    audioData.clear();
  };

  // 此方法音频缓存，这里audioData是自定义对象，这个对象会实现缓存pcm数据
  // 一个缓存区触发一次： 4096个样本帧
  recorder.onaudioprocess = function (e) {
    let inputBuffer = e.inputBuffer.getChannelData(0); //取单音道信号
    audioData.input(inputBuffer);
    sendData();
  };
};

/*
 * WebSocket
 */
function useWebSocket(config) {
  ws = new WebSocket(config.url);
  ws.binaryType = 'arraybuffer'; //传输的是 ArrayBuffer 类型的数据
  ws.onopen = function () {
    console.log('握手成功');
    if (ws.readyState == 1) {
      //ws进入连接状态，则每隔500毫秒发送一包数据
      record.start();
    }
  };

  ws.onmessage = function (msg) {
    console.info(msg);
  };

  ws.onerror = function (err) {
    console.info(err);
  };
}

/*
 * 开始对讲
 */
function speak(config, errFun) {
  let media = new Media();
  media
    .promiseStream()
    .then((mediaStream) => {
      init(new Recorder(mediaStream));
      console.log('开始对讲');
      useWebSocket(config);
    })
    .catch((msg) => {
      errFun(msg);
    });
}

/*
 * 关闭对讲
 */
function stop() {
  if (ws) {
    ws.close();
    record.stop();
    console.log('关闭对讲以及WebSocket');
  }
}

export { speak, stop };
