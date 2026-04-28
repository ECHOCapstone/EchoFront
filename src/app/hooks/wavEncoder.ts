// 브라우저 MediaRecorder 가 만든 webm/opus 등의 오디오를 모델 서버가 읽을 수 있는
// 16-bit PCM WAV 로 변환한다. 외부 라이브러리 없이 Web Audio API + DataView 만 사용.

const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

export async function blobToWav(input: Blob): Promise<Blob> {
  const arrayBuffer = await input.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return audioBufferToWav(buffer);
  } finally {
    void ctx.close();
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const totalSamples = buffer.length;
  const dataBytes = totalSamples * channels * BYTES_PER_SAMPLE;
  const ab = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(ab);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                                  // fmt chunk size
  view.setUint16(20, 1, true);                                   // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, channels * BYTES_PER_SAMPLE, true);          // block align
  view.setUint16(34, 16, true);                                   // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c));

  let offset = WAV_HEADER_BYTES;
  for (let i = 0; i < totalSamples; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, channelData[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
