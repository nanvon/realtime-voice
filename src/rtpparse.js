var FIXED_HEADER_LENGTH = 12;

class RtpParse {
  constructor(buf) {
    if (!buf instanceof Uint8Array) {
      throw new Error("buf is not Uint8Array type");
    }

    if (buf.length < FIXED_HEADER_LENGTH) {
      throw new Error("can not parse buffer smaller than fixed header");
    }

    let firstByte = buf.getUint8(0);
    let secondByte = buf.getUint8(1);
    // RTP协议的版本号
    this.version = firstByte >>> 6;
    // P（padbit）：填充标志
    this.padding = (firstByte >>> 5) & 1;
    // X（extbit）：扩展标志
    this.has_extension = (firstByte >>> 4) & 1;
    // CC：CSRC计数器
    this.csrcCount = firstByte & 0x0f;
    // M（markbit）: 标记
    this.marker = secondByte >>> 7;
    // PT（paytype）: 有效荷载类型
    this.payloadType = secondByte & 0x7f;
    // 序列号（seq_number）：占16位
    this.sequenceNumber = buf.getUint16(2);
    // 时戳(timestamp)
    this.timestamp = buf.getUint32(4);
    // 同步信源(SSRC)标识符
    this.ssrc = buf.getUint32(8);
    // 特约信源(CSRC)标识符
    this.csrc = [];
    let byteIndex = FIXED_HEADER_LENGTH

    this.payload = buf.slice(FIXED_HEADER_LENGTH + 4 * this.csrcCount);
  }
}
