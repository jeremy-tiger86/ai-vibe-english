class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const inputChannel = input[0];

        // Just pass through. We will handle resampling in the main thread 
        // or rely on AudioContext sampleRate if possible to keep this simple.
        // Optimization: We could downsample here, but for "MVP", 
        // let's try to set the context to 16kHz first.
        this.port.postMessage(inputChannel);

        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
