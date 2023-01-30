<template>
  <div>
    realtime voice intecom:<br /><br />
    <button @click="start">start</button>
    <button @click="stop">stop</button>
    <br /><br />
    <button @click="start1">start</button>
    <button @click="stop1">stop</button>
  </div>
  <br /><br />
  <div>
    voice message:<br /><br />
    <button @click="startMsg">start</button>
    <button @click="stopMsg">stop</button>
    <button @click="downPcm">pcm</button>
    <button @click="downWav">wav</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { VoiceIntercom, VoiceMessage } from 'realtime-voice/dist/index'

const config = {
  url: 'ws://192.168.6.129:2333/test'
};

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

let intercom1 = ref(null);
const start1 = () => {
  if (!intercom1.value) {
    intercom1.value = VoiceIntercom.createIntercom(config);
    intercom1.value.startSpeak((errCb) => {
      console.log(errCb);
    });
  }
};
const stop1 = () => {
  if (intercom1.value) {
    intercom1.value.stopSpeak();
    intercom1.value = null;
  }
};

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
</script>
