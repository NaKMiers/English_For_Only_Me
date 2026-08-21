/**
 * ZzFX - Zuper Zmall Zound Zynth
 *
 * Vendored, not installed. MIT licence, Frank Force (KilledByAPixel),
 * https://github.com/KilledByAPixel/ZzFX - about twenty lines of parameter-array
 * synthesis, which is cheaper to keep here than to add a runtime dependency for
 * four sound effects. `.agents/rules/project-style.md` asks for no new runtime
 * dependency; this is the alternative it asks for.
 *
 * Reduced from the original: only the parameters the four grammar stings use are
 * kept, and the global mutable state and auto-created AudioContext are gone -
 * the context is passed in, because it has to be created inside a user gesture
 * (see `useGrammarSfx`).
 *
 * Copyright (c) 2019 Frank Force
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, subject to the above copyright notice and this
 * permission notice being included in all copies or substantial portions.
 */

export interface ZzfxParams {
  attack?: number
  decay?: number
  frequency?: number
  release?: number
  shape?: 0 | 1 | 2 | 3
  slide?: number
  sustain?: number
  volume?: number
}

const SAMPLE_RATE = 44100

/**
 * Render one sting to a buffer and play it.
 *
 * Returns the source node so a caller can stop it; returns null if the context
 * is not running, which is the normal state before the first user gesture.
 */
export function zzfx(
  context: AudioContext,
  {
    attack = 0.01,
    decay = 0.05,
    frequency = 440,
    release = 0.1,
    shape = 0,
    slide = 0,
    sustain = 0.05,
    volume = 0.3,
  }: ZzfxParams
): AudioBufferSourceNode | null {
  if (context.state !== 'running') return null

  const attackSamples = Math.floor(attack * SAMPLE_RATE)
  const decaySamples = Math.floor(decay * SAMPLE_RATE)
  const sustainSamples = Math.floor(sustain * SAMPLE_RATE)
  const releaseSamples = Math.floor(release * SAMPLE_RATE)
  const length = attackSamples + decaySamples + sustainSamples + releaseSamples

  if (length <= 0) return null

  const buffer = context.createBuffer(1, length, SAMPLE_RATE)
  const data = buffer.getChannelData(0)

  let phase = 0
  let currentFrequency = frequency

  for (let index = 0; index < length; index += 1) {
    currentFrequency += slide / SAMPLE_RATE

    phase += (currentFrequency * Math.PI * 2) / SAMPLE_RATE

    const envelope = amplitudeAt({
      attackSamples,
      decaySamples,
      index,
      releaseSamples,
      sustainSamples,
    })

    data[index] = waveAt(shape, phase) * envelope * volume
  }

  const source = context.createBufferSource()

  source.buffer = buffer
  source.connect(context.destination)
  source.start()

  return source
}

function waveAt(shape: number, phase: number) {
  if (shape === 1) return phase % (Math.PI * 2) < Math.PI ? 1 : -1
  if (shape === 2) {
    const t = (phase / (Math.PI * 2)) % 1

    return 4 * Math.abs(t - 0.5) - 1
  }
  if (shape === 3) return ((phase / (Math.PI * 2)) % 1) * 2 - 1

  return Math.sin(phase)
}

function amplitudeAt({
  attackSamples,
  decaySamples,
  index,
  releaseSamples,
  sustainSamples,
}: {
  attackSamples: number
  decaySamples: number
  index: number
  releaseSamples: number
  sustainSamples: number
}) {
  if (index < attackSamples) return index / Math.max(1, attackSamples)

  if (index < attackSamples + decaySamples)
    return 1 - ((index - attackSamples) / Math.max(1, decaySamples)) * 0.3

  if (index < attackSamples + decaySamples + sustainSamples) return 0.7

  const releaseIndex = index - attackSamples - decaySamples - sustainSamples

  return 0.7 * (1 - releaseIndex / Math.max(1, releaseSamples))
}
