const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let source, gainNode, filterNode, delayNode, distortionNode, tremoloNode, tremoloOsc;

const createEffectChain = () => {
  // Create nodes
  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();
  distortionNode = audioCtx.createWaveShaper();

  // Tremolo
  tremoloNode = audioCtx.createGain(); // gain node to modulate
  tremoloOsc = audioCtx.createOscillator();
  tremoloOsc.frequency.value = 0.5 + Math.random() * 3; // 0.5–3 Hz
  tremoloOsc.connect(tremoloNode.gain);
  tremoloOsc.start();

  // Set base values
  filterNode.type = "lowpass";
  filterNode.frequency.value = 10000;

  delayNode.delayTime.value = 0.2;
  gainNode.gain.value = 1;

  distortionNode.curve = makeDistortionCurve(0);
  distortionNode.oversample = '4x';

  // Chain: source → filter → delay → distortion → tremolo → gain → destination
  filterNode.connect(delayNode);
  delayNode.connect(distortionNode);
  distortionNode.connect(tremoloNode);
  tremoloNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
};

const makeDistortionCurve = (amount) => {
  const k = typeof amount === 'number' ? amount : 50;
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
    // Randomly change subset of effects
    if (Math.random() > 0.3) {
      filterNode.frequency.setTargetAtTime(Math.random() * 1000 + 200, audioCtx.currentTime, 0.5);
    }
    if (Math.random() > 0.5) {
      delayNode.delayTime.setTargetAtTime(Math.random() * 0.5, audioCtx.currentTime, 0.5);
    }
    if (Math.random() > 0.5) {
      gainNode.gain.setTargetAtTime(0.7 + Math.random() * 0.3, audioCtx.currentTime, 0.5);
    }
    if (Math.random() > 0.6) {
      const amt = Math.floor(Math.random() * 100);
      distortionNode.curve = makeDistortionCurve(amt);
    }
    if (Math.random() > 0.4) {
      tremoloOsc.frequency.setValueAtTime(Math.random() * 5 + 0.1, audioCtx.currentTime);
    }

    const nextDelay = 15000 + Math.random() * 15000; // 15–30s
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
