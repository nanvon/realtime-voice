# realtime-voice

[仓库地址](https://gitlab.bitahub.com/zhnn-application-development/realtime-voice)

## Description

支持实时语音对讲、语音喊话、导出录音文件

## Usage

```bash
//先切换至私有库地址

npm install realtime-voice

Jenkins自动部署时，下载公司私有库可能会出问题。可以将src下面js文件都复制到项目中来使用
```

```javascript
import { VoiceIntercom, VoiceMessage } from 'realtime-voice/dist/index';

const config = {
  url: 'ws://192.168.6.129:2333/test'
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

## Contribution

```bash
npm run build:watch
```

修改`package.json`文件内的`version`值

```bash
npm publish
```

提交、推送代码
