/**
 * A stand-in agent for the bridge tests. `echo` announces its pid as an ndjson line and then
 * writes back every line it reads, the way an ACP agent answers on stdout. `sign-in` prints a
 * sign-in page and succeeds once it reads the code `good-code`.
 */
import { createInterface } from 'node:readline'

const mode = process.argv[2]
const lines = createInterface({ input: process.stdin })

if (mode === 'echo') {
  process.stdout.write(`${JSON.stringify({ pid: process.pid })}\n`)
  process.stderr.write('fake agent started\n')
  lines.on('line', (line) => process.stdout.write(`${line}\n`))
  lines.on('close', () => process.exit(0))
} else if (mode === 'sign-in') {
  process.stdout.write(
    'Opening \u001B[1mhttps://example.com/oauth?client=fake\u001B[0m in your browser\n'
  )
  lines.on('line', (line) => process.exit(line === 'good-code' ? 0 : 1))
} else {
  process.exit(2)
}
