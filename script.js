const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let source, gainNode, filterNode, delayNode;

const loadSound = async () => {
  const response = await fetch('ambient.mp3');
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = true;

  // Create audio nodes
  gainNode = audioCtx.createGain();
  filterNode = audioCtx.createBiquadFilter();
  delayNode = audioCtx.createDelay();

  // Initial settings
  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(12000, audioCtx.currentTime);

  delayNode.delayTime.setValueAtTime(0.2, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(1, audioCtx.currentTime);

  // Connect graph: source → filter → delay → gain → speakers
  source.connect(filterNode);
  filterNode.connect(delayNode);
  delayNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  source.start();
  scheduleRandomEffects();
};

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
