import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { rmSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { VideoFormat, VideoHostEncoder, VideoSink } from '#core/io/formats/video'

/** The encoder and settings ffmpeg records each format with: H.264 and VP9 in 4:2:0. */
const ENCODERS = {
  mp4: {
    encoder: 'libx264',
    args: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart']
  },
  webm: { encoder: 'libvpx-vp9', args: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32'] }
} as const

/** The tail of ffmpeg's error output a failure reports. */
const STDERR_TAIL = 2000

/** Folders of ffmpeg sinks still running in this process, removed when it is interrupted. */
const temporaryDirs = new Set<string>()
let cleanupInstalled = false

function cleanupTemporaryDirs(): void {
  for (const dir of temporaryDirs) rmSync(dir, { recursive: true, force: true })
  temporaryDirs.clear()
  removeCleanupListeners()
}

function interrupted(signal: 'SIGINT' | 'SIGTERM'): void {
  cleanupTemporaryDirs()
  // With our listener gone, the same signal takes its default path, so the exit code stays.
  process.kill(process.pid, signal)
}

const onInterrupt = () => interrupted('SIGINT')
const onTerminate = () => interrupted('SIGTERM')

function installCleanupListeners(): void {
  if (cleanupInstalled) return
  cleanupInstalled = true
  process.once('exit', cleanupTemporaryDirs)
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)
}

function removeCleanupListeners(): void {
  if (!cleanupInstalled) return
  cleanupInstalled = false
  process.off('exit', cleanupTemporaryDirs)
  process.off('SIGINT', onInterrupt)
  process.off('SIGTERM', onTerminate)
}

function trackTemporaryDir(dir: string): void {
  temporaryDirs.add(dir)
  installCleanupListeners()
}

function releaseTemporaryDir(dir: string): void {
  temporaryDirs.delete(dir)
  if (temporaryDirs.size === 0) removeCleanupListeners()
}

/** The encoders `command` lists, or none when it cannot run. */
function listEncoders(command: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(command, ['-hide_banner', '-encoders'], {
      stdio: ['ignore', 'pipe', 'ignore']
    })
    let output = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
    })
    child.on('error', () => resolve(''))
    child.on('close', (code) => resolve(code === 0 ? output : ''))
  })
}

/**
 * Encodes recorded frames with an ffmpeg on the machine, for hosts without WebCodecs such as the
 * CLI: raw RGBA frames go to its input as they come, and the file is read back when it ends.
 * A missing `command`, or one without libx264 or libvpx-vp9, supports nothing.
 */
export function createFFmpegEncoder(command = 'ffmpeg'): VideoHostEncoder {
  let encoders: Promise<string> | null = null

  return {
    async supports(format: VideoFormat) {
      if (format === 'gif') return false
      encoders ??= listEncoders(command)
      return (await encoders).includes(ENCODERS[format].encoder)
    },
    async create(format, options): Promise<VideoSink> {
      if (format === 'gif') throw new Error('ffmpeg records MP4 and WebM, not GIF')
      const dir = await mkdtemp(join(tmpdir(), 'pairdraw-ffmpeg-'))
      trackTemporaryDir(dir)
      const output = join(dir, `video.${format}`)
      let byteLength = 0
      const state = {
        /** finish or cancel ran, so no frame may follow. */
        ended: false,
        /** ffmpeg stopped reading, which a dying ffmpeg does before it exits. */
        inputClosed: false
      }
      const child = spawn(
        command,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgba',
          '-s',
          `${options.width}x${options.height}`,
          '-r',
          String(options.fps),
          '-i',
          'pipe:0',
          ...ENCODERS[format].args,
          '-pix_fmt',
          'yuv420p',
          '-y',
          output
        ],
        { stdio: ['pipe', 'ignore', 'pipe'] }
      )
      let stderr = ''
      // ffmpeg stopping early closes its input; the frame that finds it closed reports why.
      child.stdin.on('error', () => {
        state.inputClosed = true
      })
      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (chunk: string) => {
        stderr = (stderr + chunk).slice(-STDERR_TAIL)
      })
      const exited = new Promise<number | null>((resolve) => {
        child.on('error', () => resolve(-1))
        child.on('close', (code) => resolve(code))
      })

      const failure = () =>
        new Error(`ffmpeg could not encode the video: ${stderr.trim() || 'it stopped'}`)
      /** Waits for ffmpeg to exit, so its error output is complete, then reports it. */
      const failed = async (): Promise<never> => {
        await exited
        throw failure()
      }

      return {
        async add(image) {
          if (state.ended) throw new Error('The recording has ended')
          if (state.inputClosed) await failed()
          if (!child.stdin.write(image.data)) {
            // `once` drops its listeners whichever way the wait ends; ffmpeg exiting ends it too.
            const drained = once(child.stdin, 'drain').then(() => true)
            const ok = await Promise.race([drained, exited.then(() => false)]).catch(() => false)
            if (!ok || state.inputClosed) await failed()
          }
          byteLength = (await stat(output).catch(() => null))?.size ?? byteLength
        },
        async finish() {
          if (state.ended) throw new Error('The recording has ended')
          state.ended = true
          child.stdin.end()
          const code = await exited
          try {
            if (code !== 0) throw failure()
            return new Uint8Array(await readFile(output))
          } finally {
            await rm(dir, { recursive: true, force: true })
            releaseTemporaryDir(dir)
          }
        },
        async cancel() {
          if (!state.ended) {
            state.ended = true
            child.kill('SIGKILL')
          }
          await exited
          // Whatever ended the recording, its folder goes with it.
          await rm(dir, { recursive: true, force: true })
          releaseTemporaryDir(dir)
        },
        get byteLength() {
          return byteLength
        }
      }
    }
  }
}
