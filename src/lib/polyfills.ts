// iOS Safari 15.4 未満は crypto.randomUUID() を実装していない。
// アプリ全体で crypto.randomUUID() を ID 採番に使っているため、未実装環境では
// 「プランを作成」などの処理が TypeError で失敗し、画面が真っ白になってしまう。
// getRandomValues 自体は古い iOS でも使えるので、それを用いて RFC4122 v4 UUID を
// 生成するフォールバックを、他のコードが動く前にこのモジュールで定義しておく。
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  // 0x00〜0xff を 2 桁の 16 進文字列へ変換する早見表
  const byteToHex: string[] = [];
  for (let i = 0; i < 256; i++) {
    byteToHex.push((i + 0x100).toString(16).slice(1));
  }

  const randomBytes = (): Uint8Array => {
    if (typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(new Uint8Array(16));
    }
    // getRandomValues すら無い極端な環境向けの最終フォールバック
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  };

  crypto.randomUUID = function randomUUID() {
    const bytes = randomBytes();
    // version(4) と variant(10xx) のビットを設定
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return (
      byteToHex[bytes[0]] +
      byteToHex[bytes[1]] +
      byteToHex[bytes[2]] +
      byteToHex[bytes[3]] +
      '-' +
      byteToHex[bytes[4]] +
      byteToHex[bytes[5]] +
      '-' +
      byteToHex[bytes[6]] +
      byteToHex[bytes[7]] +
      '-' +
      byteToHex[bytes[8]] +
      byteToHex[bytes[9]] +
      '-' +
      byteToHex[bytes[10]] +
      byteToHex[bytes[11]] +
      byteToHex[bytes[12]] +
      byteToHex[bytes[13]] +
      byteToHex[bytes[14]] +
      byteToHex[bytes[15]]
    ) as `${string}-${string}-${string}-${string}-${string}`;
  };
}
