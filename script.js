const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let source, track, isPlaying = false;

const startBtn = document.getElementById("startBtn");
const volumeSlider = document.getElementById("volumeSlider");
const distortionControl = document.getElementById("distortionControl");
const tremoloControl = document.getElementById("tremoloControl");
const glitchControl = document.getElementById("glitchControl");
const trackSelector = document.getElementById("trackSelector");
const randomizeEffectsBtn = document.getElementById("randomizeEffectsBtn");

let gainNode = audioCtx.createGain();
let distortionNode = audioCtx.createWaveShaper();
let tremoloOsc = audioCtx.createOscillator();
let tremoloGain = audioCtx.createGain();
let delayNode = audioCtx.createDelay();
let dryGain = audioCtx.createGain();
let wetGain = audioCtx.createGain();

let buffer = null;
let currentTrack = trackSelector.value;

tremoloOsc.type = "sine";
tremoloOsc.frequency.value = 4; // slight pulse
tremoloGain.gain.value = 0.05;
tremoloOsc.connect(tremoloGain.gain);
tremoloOsc.start();

gainNode.gain.value = volumeSlider.value;
volumeSlider.addEventListener("input", () => {
  gainNode.gain.value = volumeSlider.value;
});

trackSelector.addEventListener("change", async () => {
  currentTrack = trackSelector.value;
  if (isPlaying) {
    stopAudio();
    await loadAndPlay();
  }
});

startBtn.addEventListener("click", async () => {
  if (!isPlaying) {
    await loadAndPlay();
    startBtn.textContent = "Stop";
    startBtn.classList.remove("inactive");
    startBtn.classList.add("active");
  } else {
    stopAudio();
    startBtn.textContent = "Start";
    startBtn.classList.remove("active");
    startBtn.classList.add("inactive");
  }
});

randomizeEffectsBtn.addEventListener("click", () => {
  distortionControl.value = Math.random() * 20;
  tremoloControl.value = Math.random() * 0.5;
  glitchControl.value = Math.random();
});

function createDistortionCurve(amount) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

async function loadAndPlay() {
  if (!buffer || currentTrack !== trackSelector.value) {
    const response = await fetch(currentTrack);
    const arrayBuffer = await response.arrayBuffer();
    buffer = await audioCtx.decodeAudioData(arrayBuffer);
  }

  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Set up audio graph
  distortionNode.curve = createDistortionCurve(distortionControl.value);
  distortionNode.oversample = "4x";

  tremoloOsc.connect(tremoloGain.gain);
  tremoloGain.gain.value = tremoloControl.value;

  dryGain.gain.value = 1;
  wetGain.gain.value = 0.2; // subtle reverb by default
  delayNode.delayTime.value = 0.2;

  source.connect(distortionNode);
  distortionNode.connect(tremoloGain);
  tremoloGain.connect(gainNode);
  gainNode.connect(dryGain);
  gainNode.connect(delayNode);
  delayNode.connect(wetGain);

  dryGain.connect(audioCtx.destination);
  wetGain.connect(audioCtx.destination);

  source.start();
  isPlaying = true;

  scheduleRandomEffectRotation();
}

function stopAudio() {
  if (source) {
    source.stop(0);
    source.disconnect();
  }
  isPlaying = false;
}

function scheduleRandomEffectRotation() {
  setInterval(() => {
    if (!isPlaying) return;

    // Randomize distortion curve
    const distortionAmount = parseFloat(distortionControl.value);
    distortionNode.curve = createDistortionCurve(distortionAmount);

    // Randomize tremolo
    tremoloGain.gain.linearRampToValueAtTime(
      tremoloControl.value,
      audioCtx.currentTime + 1
    );

    // Smooth reverb transition
    const newDelay = 0.1 + Math.random() * 0.3;
    delayNode.delayTime.linearRampToValueAtTime(
      newDelay,
      audioCtx.currentTime + 4
    );

    // Glitch simulation
    if (Math.random() > 0.6) {
      const glitchIntensity = parseFloat(glitchControl.value);
      if (glitchIntensity > 0.05) {
        const pitchOscAmount = 0.5 + Math.random() * 1.5;
        const stutterDuration = 0.05 + Math.random() * 0.1;

        source.playbackRate.setValueAtTime(1.0, audioCtx.currentTime);
        source.playbackRate.linearRampToValueAtTime(
          1.0 + pitchOscAmount * glitchIntensity,
          audioCtx.currentTime + stutterDuration / 2
        );
        source.playbackRate.linearRampToValueAtTime(
          1.0,
          audioCtx.currentTime + stutterDuration
        );

        gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          gainNode.gain.value * (0.6 + Math.random() * 0.3),
          audioCtx.currentTime + stutterDuration / 2
        );
        gainNode.gain.linearRampToValueAtTime(
          gainNode.gain.value,
          audioCtx.currentTime + stutterDuration
        );
      }
    }
  }, 8000);
}

