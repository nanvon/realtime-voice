# realtime-voice

## Description

支持实时语音对讲、语音喊话、导出录音文件

## Usage

```javascript
//先切换至私有库地址

npm install realtime-voice

import { VoiceIntercom, VoiceMessage  } from 'realtime-voice/dist/index'

const config = {
  url: 'ws://192.168.6.129:2333/test',
  sampleBits: 16, //输出采样数位，可以不配置，默认是16
  sampleRate: 8000, //输出采样率，可以不配置，默认是8k
};

//语音对讲：
let intercom = ref(null);
const start = () => {
  if (!intercom.value) {
    intercom.value = VoiceIntercom.createIntercom(config);
    intercom.value.startSpeak((errCb) => {
      console.log(errCb);
    });
  }
};
const stop = () => {
  if (intercom.value) {
    intercom.value.stopSpeak();
    intercom.value = null;
  }
};

//语音喊话：
let msg = ref(null);
const startMsg = () => {
  if (!msg.value) {
    msg.value = VoiceMessage.createMsg(config);
    msg.value.startSpeak((errCb) => {
      console.log(errCb);
    });
  }
};
const stopMsg = () => {
  if (msg.value) {
    msg.value.stopSpeak();
  }
};
const downPcm = () => {
  if (msg.value) {
    msg.value.downloadPCM();
  }
};
const downWav = () => {
  if (msg.value) {
    msg.value.downloadWAV();
  }
};


//详细语法见`/example/index.html`或`index.vue`
```

~~暂时不支持同时多个对讲实例，如：开启 A 对讲，在开启 B 对讲之前，需要先关闭 A 对讲。~~
现已支持同时多个对讲实例。
