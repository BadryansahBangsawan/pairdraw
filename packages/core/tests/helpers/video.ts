import { CustomVideoEncoder, EncodedPacket } from 'mediabunny'

/**
 * An AVC "encoder" for engines without WebCodecs, such as Bun: every frame becomes a key frame
 * of a few placeholder bytes, with an `avcC` record the MP4 muxer can store. The muxer never
 * decodes them, so the file's structure can be read back exactly.
 */
export class PlaceholderAVCEncoder extends CustomVideoEncoder {
  static override supports(codec: string): boolean {
    return codec === 'avc'
  }
  // Nothing to start, flush, or release: every frame is written as it comes.
  init(): Promise<void> {
    return Promise.resolve()
  }
  encode(sample: Parameters<CustomVideoEncoder['encode']>[0]): void {
    const packet = new EncodedPacket(
      new Uint8Array([0, 0, 0, 1, 0x65, 0x88]),
      'key',
      sample.timestamp,
      sample.duration
    )
    this.onPacket(packet, {
      decoderConfig: {
        codec: 'avc1.42001f',
        codedWidth: this.config.width,
        codedHeight: this.config.height,
        // configurationVersion 1, Baseline 3.1, an SPS for 64×32 (4×2 macroblocks) and a PPS.
        description: new Uint8Array([
          1, 0x42, 0, 0x1f, 0xff, 0xe1, 0, 7, 0x67, 0x42, 0, 0x1f, 0xda, 0x11, 0x64, 1, 0, 4, 0x68,
          0xce, 0x3c, 0x80
        ])
      }
    })
  }
  flush(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}
