/**
 * 入口文件
 */
import { intercom } from './intercom';
import { msg } from './msg'

//实时语音喊话
let VoiceIntercom = {};
VoiceIntercom.createIntercom = function (config) {
  return new intercom(config);
};

//发送语音消息、导出录音文件
let VoiceMessage = {};
VoiceMessage.createMsg = function (config) {
  return new msg(config);
};

export { VoiceIntercom, VoiceMessage };
