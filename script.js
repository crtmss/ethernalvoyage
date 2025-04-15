const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let source, gainNode, filterNode, delayNode, distortionNode, tremoloNode, tremoloOsc, compressor;
let selectedTrack = "ambient.mp3";
let isPlaying = false;

const trackSelector = document.getElementById("trackSelector");
const volumeSlider = document.getElementById("volumeSlider");
const distortionControl = document.getElementById("distortionControl");
const reverbControl = document.getElementById("reverbControl");
const tremoloControl = document.getElementById("tremoloControl");
const randomizeEffectsBtn = document.getElementById("randomizeEffectsBtn");
const startBtn = document.getElementById("startBtn");

trackSelector.addEventListener("change", () => {
  selectedTrack = trackSelector.value;
  if (isPlaying) stopAndReloadTrack();
});

volumeSlider.addEventListener("input", () => {
  if (gainNode) {
    gainNode.gain.value = parseFloat(volumeSlider.value);
  }
});

const createEffectChain = () => {
  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();
  distortionNode = audioCtx.createWaveShaper();
  compressor = audioCtx.createDynamicsCompressor();

  compressor.threshold.setValueAtTime(-30, audioCtx.currentTime);
  compressor.knee.setValueAtTime(20, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(3, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

  tremoloNode = audioCtx.createGain();
  tremoloNode.gain.value = parseFloat(volumeSlider.value);

  tremoloOsc = audioCtx.createOscillator();
  tremoloOsc.type = "sine";
  tremoloOsc.frequency.value = 0.1 + Math.random() * 0.3;

  const tremoloDepth = audioCtx.createGain();
  tremoloDepth.gain.value = 0.05;
  tremoloOsc.connect(tremoloDepth);
  tremoloDepth.connect(tremoloNode.gain);
  tremoloOsc.start();

  filterNode.type = "lowpass";
  filterNode.frequency.value = 8000;
  delayNode.delayTime.value = 0.1;
  gainNode.gain.value = parseFloat(volumeSlider.value);
  distortionNode.curve = makeDistortionCurve(5);
  distortionNode.oversample = '2x';

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

const loadSound = async (track) => {
  const response = await fetch(track);
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

const stopAndReloadTrack = async () => {
  if (source) {
    try {
      source.stop();
    } catch {}
  }
  loadSound(selectedTrack);
};

const scheduleRandomEffectRotation = () => {
  const applyRandomEffects = () => {
    const now = audioCtx.currentTime;
    const transition = 2 + Math.random();

    if (Math.random() > 0.3) {
      const freq = 3000 + Math.random() * 3000;
      filterNode.frequency.linearRampToValueAtTime(freq, now + transition);
    }
    if (Math.random() > 0.4) {
      const delayTime = 0.05 + Math.random() * 0.1;
      delayNode.delayTime.linearRampToValueAtTime(delayTime, now + transition);
    }
    if (Math.random() > 0.5) {
      const gain = 0.85 + Math.random() * 0.1;
      gainNode.gain.linearRampToValueAtTime(gain, now + transition);
    }
    if (Math.random() > 0.6) {
      const amount = 2 + Math.random() * 6;
      distortionNode.curve = makeDistortionCurve(amount);
    }
    if (Math.random() > 0.4) {
      const tremFreq = 0.1 + Math.random() * 0.3;
      tremoloOsc.frequency.linearRampToValueAtTime(tremFreq, now + transition);
    }

    const next = 20000 + Math.random() * 10000;
    setTimeout(applyRandomEffects, next);
  };

  applyRandomEffects();
};

// Toggle button functionality
startBtn.addEventListener("click", async () => {
  if (!isPlaying) {
    if (audioCtx.state === "suspended") await audioCtx.resume();
    loadSound(selectedTrack);
    isPlaying = true;
    startBtn.textContent = "Stop";
    startBtn.classList.remove("inactive");
    startBtn.classList.add("active");
  } else {
    if (source) source.stop();
    isPlaying = false;
    startBtn.textContent = "Start";
    startBtn.classList.remove("active");
    startBtn.classList.add("inactive");
  }
});
