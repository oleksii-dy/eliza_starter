export function getWavHeader(
    dataLength: number,
    sampleRate: number,
    numberOfChannels: number,
    bitsPerSample: number
): Buffer {
    const buffer = Buffer.alloc(44);

    // RIFF identifier 'RIFF'
    buffer.write('RIFF', 0);

    // file length minus RIFF identifier length and file description length
    buffer.writeInt32LE(36 + dataLength, 4);

    // RIFF type 'WAVE'
    buffer.write('WAVE', 8);

    // format chunk identifier 'fmt '
    buffer.write('fmt ', 12);

    // format chunk length
    buffer.writeInt32LE(16, 16);

    // sample format (raw)
    buffer.writeInt16LE(1, 20);

    // channel count
    buffer.writeInt16LE(numberOfChannels, 22);

    // sample rate
    buffer.writeInt32LE(sampleRate, 24);

    // byte rate (sample rate * block align)
    buffer.writeInt32LE(sampleRate * numberOfChannels * bitsPerSample / 8, 28);

    // block align (channel count * bytes per sample)
    buffer.writeInt16LE(numberOfChannels * bitsPerSample / 8, 32);

    // bits per sample
    buffer.writeInt16LE(bitsPerSample, 34);

    // data chunk identifier 'data'
    buffer.write('data', 36);

    // data chunk length
    buffer.writeInt32LE(dataLength, 40);

    return buffer;
} 