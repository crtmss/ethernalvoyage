const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let source, gainNode, filterNode, delayNode;

const loadSound = async () => {
  const response = await fetch('ambient.mp3');
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = true;

  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();

  filterNode.type = "lowpass";
  filterNode.frequency.value = 12000;

  delayNode.delayTime.value = 0.2;
  gainNode.gain.value = 1;

  source.connect(filterNode);
  filterNode.connect(delayNode);
  delayNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  source.start();
  scheduleRandomEffects();
};

document.getElementById("startBtn").addEventListener("click", async () => {
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  loadSound();
  document.getElementById("startBtn").style.display = 'none'; // hide after click
});

const scheduleRandomEffects = () => {
  setInterval(() => {
    const freq = Math.random() * 1000 + 200; // 200Hz – 1200Hz
    const delay = Math.random() * 0.5;       // 0s – 0.5s
    const gain = 0.8 + Math.random() * 0.2;  // 0.8 – 1.0

    filterNode.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.5);
    delayNode.delayTime.setTargetAtTime(delay, audioCtx.currentTime, 0.5);
    gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.5);

    console.log(`Effect: freq ${freq}, delay ${delay}, gain ${gain}`);
  }, 30000); // every 30s
};

// Audio context must start on user interaction (browser requirement)
document.body.addEventListener("click", () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  loadSound();
}, { once: true });
