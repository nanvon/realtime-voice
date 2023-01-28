Number.prototype.toUnsigned = function () {
  return (this >>> 1) * 2 + (this & 1);
};

//TypedArray 数组没有concat方法。如果想要合并多个 TypedArray 数组，可以用下面这个函数。
function concatenate(resultConstructor, ...arrays) {
  let totalLength = 0;
  for (let arr of arrays) {
    totalLength += arr.length;
  }
  let result = new resultConstructor(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export const RtpPacket = function (bufpayload) {
  // this._bufpkt = null;

  // if (bufpayload.length > 512) {
  //   this._bufpkt = bufpayload;
  // } else {
  // this._bufpkt = new Uint8Array(12 + bufpayload.length);

  //tcp
  let tcpHeader = new Uint8Array(2);
  const len = bufpayload.length + 12;
  tcpHeader[0] = (len >> 8) & 0xff;
  tcpHeader[1] = len & 0xff;

  this._bufpkt = new Uint8Array(12);
  this._bufpkt[0] = 0x80;
  this._bufpkt[1] = 0;
  var SN = Math.floor(1000 * Math.random());
  this._bufpkt[2] = SN >>> 8;
  this._bufpkt[3] = SN & 0xff;
  this._bufpkt[4] = 0;
  this._bufpkt[5] = 0;
  this._bufpkt[6] = 0;
  this._bufpkt[7] = 1;
  this._bufpkt[8] = 0;
  this._bufpkt[9] = 0;
  this._bufpkt[10] = 0;
  this._bufpkt[11] = 1;
  // bufpayload.copyWithin(this._bufpkt, 12);
  this._bufpkt = concatenate(Uint8Array, tcpHeader, this._bufpkt, bufpayload);
  // }
};

RtpPacket.prototype.__defineGetter__('type', function () {
  return this._bufpkt[1] & 0x7f;
});
RtpPacket.prototype.__defineSetter__('type', function (val) {
  val = val.toUnsigned();
  if (val <= 127) {
    this._bufpkt[1] -= this._bufpkt[1] & 0x7f;
    this._bufpkt[1] |= val;
  }
});
RtpPacket.prototype.__defineGetter__('seq', function () {
  return (this._bufpkt[2] << 8) | this._bufpkt[3];
});
RtpPacket.prototype.__defineSetter__('seq', function (val) {
  val = val.toUnsigned();
  if (val <= 65535) {
    this._bufpkt[2] = val >>> 8;
    this._bufpkt[3] = val & 0xff;
  }
});
RtpPacket.prototype.__defineGetter__('time', function () {
  return (
    (this._bufpkt[4] << 24) | (this._bufpkt[5] << 16) | (this._bufpkt[6] << 8) | this._bufpkt[7]
  );
});
RtpPacket.prototype.__defineSetter__('time', function (val) {
  val = val.toUnsigned();
  if (val <= 4294967295) {
    this._bufpkt[4] = val >>> 24;
    this._bufpkt[5] = (val >>> 16) & 0xff;
    this._bufpkt[6] = (val >>> 8) & 0xff;
    this._bufpkt[7] = val & 0xff;
  }
});
RtpPacket.prototype.__defineGetter__('source', function () {
  return (
    (this._bufpkt[8] << 24) | (this._bufpkt[9] << 16) | (this._bufpkt[10] << 8) | this._bufpkt[11]
  );
});
RtpPacket.prototype.__defineSetter__('source', function (val) {
  val = val.toUnsigned();
  if (val <= 4294967295) {
    this._bufpkt[8] = val >>> 24;
    this._bufpkt[9] = (val >>> 16) & 0xff;
    this._bufpkt[10] = (val >>> 8) & 0xff;
    this._bufpkt[11] = val & 0xff;
  }
});
// RtpPacket.prototype.__defineGetter__('payload', function () {
//   return this._bufpkt.slice(12, this._bufpkt.length);
// });
// RtpPacket.prototype.__defineSetter__('payload', function (val) {
//   if (Buffer.isBuffer(val) && val.length <= 512) {
//     var newsize = 12 + val.length;
//     if (this._bufpkt.length == newsize) val.copyWithin(this._bufpkt, 12);
//     else {
//       var newbuf = new Buffer(newsize);
//       this._bufpkt.copyWithin(newbuf, 0);
//       val.copyWithin(newbuf, 12);
//       this._bufpkt = newbuf;
//     }
//   }
// });
RtpPacket.prototype.__defineGetter__('packet', function () {
  return this._bufpkt;
});
