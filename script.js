const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let source, gainNode, filterNode, delayNode, distortionNode, tremoloNode, tremoloOsc;

const createEffectChain = () => {
  // Create nodes
  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();
  distortionNode = audioCtx.createWaveShaper();

  // Tremolo
  tremoloNode = audioCtx.createGain();
  tremoloOsc = audioCtx.createOscillator();
  tremoloOsc.frequency.value = 0.2 + Math.random() * 0.5; // Slow pulse (0.2–0.7 Hz)
  tremoloOsc.connect(tremoloNode.gain);
  tremoloOsc.start();

  // Soft defaults
  filterNode.type = "lowpass";
  filterNode.frequency.value = 10000; // Gentle tone roll-off

  delayNode.delayTime.value = 0.15;
  gainNode.gain.value = 0.95;

  distortionNode.curve = makeDistortionCurve(5); // Very mild saturation
  distortionNode.oversample = '2x';

  // Chain: source → filter → delay → distortion → tremolo → gain → destination
  filterNode.connect(delayNode);
  delayNode.connect(distortionNode);
  distortionNode.connect(tremoloNode);
  tremoloNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
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
    // Apply random but subtle effect changes
    if (Math.random() > 0.3) {
      const newFreq = Math.random() * 2000 + 3000; // 3k–5k Hz
      filterNode.frequency.setTargetAtTime(newFreq, audioCtx.currentTime, 1);
    }

    if (Math.random() > 0.4) {
      const newDelay = Math.random() * 0.1 + 0.05; // 50–150ms
      delayNode.delayTime.setTargetAtTime(newDelay, audioCtx.currentTime, 1);
    }

    if (Math.random() > 0.4) {
      const newGain = 0.85 + Math.random() * 0.1; // 0.85–0.95
      gainNode.gain.setTargetAtTime(newGain, audioCtx.currentTime, 1);
    }

    if (Math.random() > 0.6) {
      const amt = 3 + Math.random() * 5; // very subtle distortion
      distortionNode.curve = makeDistortionCurve(amt);
    }

    if (Math.random() > 0.5) {
      const tremFreq = 0.1 + Math.random() * 0.4; // 0.1–0.5 Hz
      tremoloOsc.frequency.setValueAtTime(tremFreq, audioCtx.currentTime);
    }

    const nextDelay = 20000 + Math.random() * 15000; // 20–35s between changes
    setTimeout(applyRandomEffects, nextDelay);
  };

  applyRandomEffects();
};

// Start on user interaction
document.getElementById("startBtn").addEventListener("click", async () => {
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  loadSound();
  document.getElementById("startBtn").style.display = 'none';
});
