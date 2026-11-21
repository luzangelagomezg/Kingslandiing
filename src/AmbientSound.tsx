import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const notes = [146.83, 220, 174.61, 196, 146.83, 130.81]
const phraseSeconds = notes.length * 2

function playPhrase(context: AudioContext, output: AudioNode, start: number) {
  notes.forEach((frequency, index) => {
    const time = start + index * 2
    const tone = context.createOscillator()
    const envelope = context.createGain()
    tone.type = 'triangle'
    tone.frequency.value = frequency
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(0.22, time + 0.3)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 1.8)
    tone.connect(envelope).connect(output)
    tone.start(time)
    tone.stop(time + 1.8)
  })
}

export default function AmbientSound() {
  const contextRef = useRef<AudioContext | null>(null)
  const outputRef = useRef<GainNode | null>(null)
  const timerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(70)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      const context = contextRef.current
      contextRef.current = null
      outputRef.current = null
      if (context && context.state !== 'closed') {
        void context.close().catch((reason: unknown) => console.error('No se pudo cerrar el audio ambiental:', reason))
      }
    }
  }, [])

  const toggleSound = async () => {
    setBusy(true)
    setError('')
    try {
      if (contextRef.current) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        timerRef.current = null
        const context = contextRef.current
        await context.close()
        contextRef.current = null
        outputRef.current = null
        if (mountedRef.current) setPlaying(false)
      } else {
        if (!window.AudioContext) throw new Error('AudioContext no está disponible')
        const context = new AudioContext()
        contextRef.current = context
        await context.resume()
        if (!mountedRef.current || contextRef.current !== context) return
        if (context.state !== 'running') throw new Error('El navegador no inició el audio')

        const output = context.createGain()
        output.gain.value = volume / 100
        output.connect(context.destination)
        outputRef.current = output

        for (const frequency of [73.42, 110]) {
          const drone = context.createOscillator()
          const level = context.createGain()
          drone.type = 'sine'
          drone.frequency.value = frequency
          level.gain.setValueAtTime(0, context.currentTime)
          level.gain.linearRampToValueAtTime(0.06, context.currentTime + 2)
          drone.connect(level).connect(output)
          drone.start()
        }

        let nextStart = context.currentTime + 0.1
        playPhrase(context, output, nextStart)
        nextStart += phraseSeconds
        timerRef.current = window.setInterval(() => {
          nextStart = Math.max(nextStart, context.currentTime + 0.1)
          playPhrase(context, output, nextStart)
          nextStart += phraseSeconds
        }, phraseSeconds * 1000)
        setPlaying(true)
      }
    } catch (reason) {
      console.error('No se pudo cambiar el audio ambiental:', reason)
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
      const context = contextRef.current
      contextRef.current = null
      outputRef.current = null
      if (context && context.state !== 'closed') {
        void context.close().catch((closeReason: unknown) => console.error('No se pudo cerrar el audio ambiental:', closeReason))
      }
      if (mountedRef.current) {
        setPlaying(false)
        setError('No se pudo reproducir el sonido. Revisa el audio del navegador y vuelve a intentarlo.')
      }
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  return (
    <div className="ambient-control">
      <button className="ambient-toggle" type="button" onClick={toggleSound} disabled={busy} aria-pressed={playing}>
        {playing ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
        Sonido ambiental: {playing ? 'activado' : 'desactivado'}
      </button>
      <label className="ambient-volume">
        Volumen
        <input type="range" min="0" max="100" step="5" value={volume} onChange={(event) => {
          const value = Number(event.target.value)
          setVolume(value)
          if (outputRef.current) outputRef.current.gain.value = value / 100
        }} />
        <span>{volume}%</span>
      </label>
      {error && <p className="ambient-error" role="alert">{error}</p>}
    </div>
  )
}
