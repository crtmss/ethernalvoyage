const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let source, gainNode, filterNode, delayNode, distortionNode, tremoloNode, tremoloOsc, compressor;

const createEffectChain = () => {
  // Core FX nodes
  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();
  distortionNode = audioCtx.createWaveShaper();
  compressor = audioCtx.createDynamicsCompressor();

  // Soft post-mastering
  compressor.threshold.setValueAtTime(-30, audioCtx.currentTime);
  compressor.knee.setValueAtTime(20, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(3, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

  // Tremolo setup
  tremoloNode = audioCtx.createGain();
  tremoloNode.gain.value = 0.95; // 5% tremolo depth
  tremoloOsc = audioCtx.createOscillator();
  tremoloOsc.type = "sine";
  tremoloOsc.frequency.value = 0.1 + Math.random() * 0.3; // slow wave

  const tremoloDepth = audioCtx.createGain();
  tremoloDepth.gain.value = 0.05; // ~5% modulation depth
  tremoloOsc.connect(tremoloDepth);
  tremoloDepth.connect(tremoloNode.gain);
  tremoloOsc.start();

  // Initial settings
  filterNode.type = "lowpass";
  filterNode.frequency.value = 8000;

  delayNode.delayTime.value = 0.1;
  gainNode.gain.value = 0.9;

  distortionNode.curve = makeDistortionCurve(5);
  distortionNode.oversample = '2x';

  // Connect the chain
  filterNode.connect(delayNode);
  delayNode.connect(distortionNode);
  distortionNode.connect(tremoloNode);
  tremoloNode.connect(gainNode);
  gainNode.connect(compressor);
  compressor.connect(audioCtx.destination);
};

const makeDistortionCurve = (amount) => {
  const k = typeof amount === 'number' ? amount : 5;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const loadSound = async () => {
  const response = await fetch('ambient.mp3');
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = true;

  createEffectChain();
  source.connect(filterNode);
  source.start();

  scheduleRandomEffectRotation();
};

const scheduleRandomEffectRotation = () => {
  const applyRandomEffects = () => {
    const now = audioCtx.currentTime;
    const transition = 2 + Math.random(); // 2–3s

    // Smooth filter sweep
    if (Math.random() > 0.3) {
      const freq = 3000 + Math.random() * 3000; // 3k–6k
      filterNode.frequency.linearRampToValueAtTime(freq, now + transition);
    }

    // Subtle delay modulation
    if (Math.random() > 0.4) {
      const delayTime = 0.05 + Math.random() * 0.1;
      delayNode.delayTime.linearRampToValueAtTime(delayTime, now + transition);
    }

    // Gentle gain changes
    if (Math.random() > 0.5) {
      const gain = 0.85 + Math.random() * 0.1;
      gainNode.gain.linearRampToValueAtTime(gain, now + transition);
    }

    // Soft distortion changes
    if (Math.random() > 0.6) {
      const amount = 2 + Math.random() * 6;
      distortionNode.curve = makeDistortionCurve(amount);
    }

    // Tremolo frequency drift
    if (Math.random() > 0.4) {
      const tremFreq = 0.1 + Math.random() * 0.3;
      tremoloOsc.frequency.linearRampToValueAtTime(tremFreq, now + transition);
    }

    // Schedule next modulation cycle
    const next = 20000 + Math.random() * 10000; // 20–30s
    setTimeout(applyRandomEffects, next);
  };

  applyRandomEffects();
};

// Wait for user to start
document.getElementById("startBtn").addEventListener("click", async () => {
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  loadSound();
  document.getElementById("startBtn").style.display = 'none';
});
