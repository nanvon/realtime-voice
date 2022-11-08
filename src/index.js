/**
 * 入口文件
 */
import { intercom } from './intercom';
import { msg } from './msg'

//实时语音对讲
let VoiceIntercom = {};
VoiceIntercom.createIntercom = function (config) {
  return new intercom(config);
};

//语音喊话、导出录音文件
let VoiceMessage = {};
VoiceMessage.createMsg = function (config) {
  return new msg(config);
};

export { VoiceIntercom, VoiceMessage };
