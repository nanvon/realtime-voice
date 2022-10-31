/**
 * 语音喊话
 * 使用：
import { speakMsg, stopMsg, downloadPCM } from '@/utils/voice/voiceMsg'

const startMsg = () => {
  const config = {
    url: 'ws://localhost:1111/socketTest'
  }
  speakMsg(config, (err) => {
    console.log('err: ', err);
    ElMessage.error(err)
  })
}
const closeMsg = () => {
  stopMsg()
}
const downPcm = () => {
  downloadPCM();
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
  let recorder = context.createScriptProcessor(4096, 1, 1); //创建声音的缓存节点，第一个参数缓存大小，一般数值为1024, 2048, 4096, 8192, 16384，这里选用4096，第二个和第三个参数指的是输入和输出的声道数
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
    compress: function () {
      //合并
      let data = new Float32Array(this.size);
      let offset = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        data.set(this.buffer[i], offset);
        offset += this.buffer[i].length;
      }
      //压缩
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
      let sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
      let sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
      let bytes = this.compress();
      let dataLength = bytes.length * (sampleBits / 8);
      let buffer = new ArrayBuffer(dataLength);
      let data = new DataView(buffer);
      let offset = 0;
      for (let i = 0; i < bytes.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, bytes[i]));
        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      return new Blob([data]);
    },
    //转换成wav文件数据
    encodeWAV: function () {
      let sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
      let sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
      let bytes = this.compress();
      let dataLength = bytes.length * (sampleBits / 8);
      let buffer = new ArrayBuffer(44 + dataLength);
      let data = new DataView(buffer);
      let offset = 0;
      let writeString = function (str) {
        for (var i = 0; i < str.length; i++) {
          data.setUint8(offset + i, str.charCodeAt(i));
        }
      };
      // 资源交换文件标识符
      writeString('RIFF');
      offset += 4;
      // 下个地址开始到文件尾总字节数,即文件大小-8
      data.setUint32(offset, 36 + dataLength, true);
      offset += 4;
      // WAV文件标志
      writeString('WAVE');
      offset += 4;
      // 波形格式标志
      writeString('fmt ');
      offset += 4;
      // 过滤字节,一般为 0x10 = 16
      data.setUint32(offset, 16, true);
      offset += 4;
      // 格式类别 (PCM形式采样数据)
      data.setUint16(offset, 1, true);
      offset += 2;
      // 通道数
      data.setUint16(offset, 1, true); //第二个参数为channelCount
      offset += 2;
      // 采样率,每秒样本数,表示每个通道的播放速度
      data.setUint32(offset, sampleRate, true);
      offset += 4;
      // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
      data.setUint32(offset, 1 * sampleRate * (sampleBits / 8), true); //channelCount
      offset += 4;
      // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
      data.setUint16(offset, 1 * (sampleBits / 8), true); //channelCount
      offset += 2;
      // 每样本数据位数
      data.setUint16(offset, sampleBits, true);
      offset += 2;
      // 数据标识符
      writeString('data');
      offset += 4;
      // 采样数据总数,即数据总大小-44
      data.setUint32(offset, dataLength, true);
      offset += 4;
      // 写入采样数据
      data = this.reshapeWavData(sampleBits, offset, bytes, data);
      return data;
    },
    reshapeWavData: function (sampleBits, offset, iBytes, oData) {
      // 8位采样数位
      if (sampleBits === 8) {
        for (let i = 0; i < iBytes.length; i++, offset++) {
          let s = Math.max(-1, Math.min(1, iBytes[i]));
          let val = s < 0 ? s * 0x8000 : s * 0x7fff;
          val = parseInt(255 / (65535 / (val + 32768)));
          oData.setInt8(offset, val, true);
        }
      } else {
        for (let i = 0; i < iBytes.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, iBytes[i]));
          oData.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
      }
      return oData;
    },
    getFullWavData: function () {
      // 用blob生成文件
      const data = this.encodeWAV();
      return new Blob([data], { type: 'audio/wav' });
    },
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
  this.getWav = function () {
    return audioData.getFullWavData();
  };

  this.clear = function () {
    audioData.clear();
  };

  // 此方法音频缓存，这里audioData是自定义对象，这个对象会实现缓存pcm数据
  recorder.onaudioprocess = function (e) {
    let inputBuffer = e.inputBuffer.getChannelData(0);
    audioData.input(inputBuffer);
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
function speakMsg(config, errFun) {
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
function stopMsg() {
  if (ws) {
    let reader = new FileReader();
    reader.onload = (e) => {
      let outBuffer = e.target.result;
      let arr = new Int8Array(outBuffer);
      ws.send(arr);
      ws.close();
      record.stop();
      console.log('关闭对讲以及WebSocket');
    };
    reader.readAsArrayBuffer(record.getBlob());
  }
}

/**
 * 下载PCM文件
 */
function downloadPCM() {
  if (record === null) return alert('请先开始录音');

  var oA = document.createElement('a');
  oA.href = window.URL.createObjectURL(record.getBlob());
  console.log('oA.href: ', oA.href);
  oA.download = oA.href.split('/')[3] + '.pcm';
  oA.click();

  ws.close();
  record.stop();
  console.log('关闭对讲以及WebSocket，然后下载PCM文件');
}

/**
 * 下载wav文件
 */
function downloadWAV() {
  if (record === null) return alert('请先开始录音');

  var oA = document.createElement('a');
  oA.href = window.URL.createObjectURL(record.getWav());
  console.log('oA.href: ', oA.href);
  oA.download = oA.href.split('/')[3] + '.wav';
  oA.click();

  ws.close();
  record.stop();
  console.log('关闭对讲以及WebSocket，然后下载WAV文件');
}

export { speakMsg, stopMsg, downloadPCM, downloadWAV };
