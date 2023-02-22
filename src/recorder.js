/**
 * 录音对象
 * @param {*} stream 音频流
 * @param {*} config 配置参数
 * @param {*} callback 回调函数：用于发送分包数据
 */
let Recorder = function (stream, config, callback) {
  //音频配置参数
  let sampleBits = config.sampleBits || 16; //输出采样数位 8, 16
  let sampleRate = config.sampleRate || 8000; //输出采样率
  let bufferSize = 2048; //缓冲区大小

  let context = new AudioContext(); //首先new一个AudioContext对象，作为声源的载体
  let audioInput = context.createMediaStreamSource(stream); //将声音输入这个对像，stream 就是上面返回音源
  /**
   * createScriptProcessor 创建声音的缓存节点
   * 第一个参数为缓存区大小，该取值控制着 audioprocess 事件被分派的频率，以及每一次调用多少样本帧被处理,
   * 一般数值为1024, 2048, 4096, 8192, 16384。
   * 第二个和第三个参数指的是输入和输出的声道数
   */
  let recorder = context.createScriptProcessor(bufferSize, 1, 1);
  // 对音频信号进行处理
  let audioData = {
    size: 0, //录音文件长度
    buffer: [], //录音缓存
    inputSampleRate: 48000, //输入采样率
    inputSampleBits: 16, //输入采样数位 8, 16
    outputSampleRate: sampleRate, //输出采样率
    outputSampleBits: sampleBits, //输出采样数位
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
  // 一个缓存区触发一次： bufferSize个样本帧
  recorder.onaudioprocess = function (e) {
    let inputBuffer = e.inputBuffer.getChannelData(0); //取单音道信号
    audioData.input(inputBuffer);
    callback(audioData);
  };
};
export default Recorder;
