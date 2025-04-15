const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let source, buffer = null, isPlaying = false;
let currentTrack = "ambient.mp3";

const startBtn = document.getElementById("startBtn");
const volumeSlider = document.getElementById("volumeSlider");
const distortionControl = document.getElementById("distortionControl");
const tremoloControl = document.getElementById("tremoloControl");
const glitchControl = document.getElementById("glitchControl");
const trackSelector = document.getElementById("trackSelector");
const randomizeEffectsBtn = document.getElementById("randomizeEffectsBtn");

const gainNode = audioCtx.createGain();
const distortionNode = audioCtx.createWaveShaper();
const tremoloOsc = audioCtx.createOscillator();
const tremoloGain = audioCtx.createGain();
const delayNode = audioCtx.createDelay();
const dryGain = audioCtx.createGain();
const wetGain = audioCtx.createGain();

tremoloOsc.type = "sine";
tremoloOsc.frequency.value = 4;
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
  distortionControl.value = Math.random().toFixed(2);
  tremoloControl.value = Math.random().toFixed(2);
  glitchControl.value = Math.random().toFixed(2);
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
  const response = await fetch(currentTrack);
  const arrayBuffer = await response.arrayBuffer();
  buffer = await audioCtx.decodeAudioData(arrayBuffer);

  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  source.connect(distortionNode);
  distortionNode.connect(tremoloGain);
  tremoloGain.connect(gainNode);
  gainNode.connect(dryGain);
  gainNode.connect(delayNode);
  delayNode.connect(wetGain);
  dryGain.connect(audioCtx.destination);
  wetGain.connect(audioCtx.destination);

  applyEffectSettings();
  source.start();
  isPlaying = true;
  scheduleRandomEffectRotation();
}

function stopAudio() {
  if (source) source.stop();
  isPlaying = false;
}

function applyEffectSettings() {
  const distortionAmt = parseFloat(distortionControl.value) * 100;
  const tremoloAmt = parseFloat(tremoloControl.value) * 0.5;

  distortionNode.curve = createDistortionCurve(distortionAmt);
  tremoloGain.gain.linearRampToValueAtTime(tremoloAmt, audioCtx.currentTime + 0.5);
  delayNode.delayTime.value = 0.2;
  dryGain.gain.value = 1;
  wetGain.gain.value = 0.2;
}

function scheduleRandomEffectRotation() {
  setInterval(() => {
    if (!isPlaying) return;
    applyEffectSettings();

    const newDelay = 0.1 + Math.random() * 0.3;
    delayNode.delayTime.linearRampToValueAtTime(newDelay, audioCtx.currentTime + 4);

    const glitchIntensity = parseFloat(glitchControl.value);
    if (Math.random() > 0.6 && glitchIntensity > 0.05) {
      glitchActive = true;
      const stutterDur = 0.1 + Math.random() * 0.1;
      const rateShift = 1.0 + (Math.random() * glitchIntensity);

      source.playbackRate.setValueAtTime(1.0, audioCtx.currentTime);
      source.playbackRate.linearRampToValueAtTime(rateShift, audioCtx.currentTime + stutterDur / 2);
      source.playbackRate.linearRampToValueAtTime(1.0, audioCtx.currentTime + stutterDur);

      gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(gainNode.gain.value * 0.7, audioCtx.currentTime + stutterDur / 2);
      gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, audioCtx.currentTime + stutterDur);

      setTimeout(() => { glitchActive = false; }, 300);
    }
  }, 8000);
}

let glitchActive = false;
function animateSliders() {
  const now = audioCtx.currentTime;
  const tremFreq = tremoloOsc.frequency.value;
  const tremPercent = parseFloat(tremoloControl.value);
  const visualTrem = (Math.sin(now * tremFreq * 2 * Math.PI) + 1) / 2;
  tremoloControl.style.setProperty('--progress', tremPercent * visualTrem);

  if (glitchActive) {
    glitchControl.style.setProperty('--progress', glitchControl.value * (0.6 + Math.random() * 0.4));
  } else {
    glitchControl.style.setProperty('--progress', glitchControl.value);
  }

  distortionControl.style.setProperty('--progress', distortionControl.value);
  requestAnimationFrame(animateSliders);
}
animateSliders();


