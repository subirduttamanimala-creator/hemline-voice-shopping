const sampleRate = 16000;

async function decodeAudio(blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const duration = Math.min(decoded.duration,30);
    const offline = new OfflineAudioContext(1,Math.max(1,Math.ceil(duration*sampleRate)),sampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    await context.close();
  }
}

function isQuiet(audio) {
  const windowSize = sampleRate/20;
  for (let start = 0; start < audio.length; start += windowSize) {
    let energy = 0;
    const end = Math.min(start+windowSize,audio.length);
    for (let i = start; i < end; i++) energy += audio[i]*audio[i];
    if (energy/(end-start) > 0.000004) return false;
  }
  return true;
}

function permissionMessage(error) {
  switch(error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was blocked. Allow it in site permissions, or open Hemline in your regular browser.';
    case 'NotFoundError':
      return 'No microphone was detected. Connect one and try again.';
    case 'NotReadableError':
      return 'The microphone could not be opened. Check your device’s microphone settings and try again.';
    default:
      return 'The recording could not start. Try again or type your request.';
  }
}

export function setupVoice(button, status, onTranscript) {
  let session;
  let worker;
  let nextId = 0;
  let pending;
  const supported = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.AudioContext && window.OfflineAudioContext && window.Worker);

  function idle() {
    button.disabled = !supported;
    button.textContent = 'Speak';
    button.setAttribute('aria-pressed','false');
  }

  function release(recording) {
    clearTimeout(recording.timer);
    recording.stream?.getTracks().forEach(track => track.stop());
  }

  function discardWorker() {
    worker?.terminate();
    worker = undefined;
    pending = undefined;
  }

  function reset() {
    const recording = session;
    session = undefined;
    if (recording) {
      release(recording);
      if (recording.recorder?.state === 'recording') recording.recorder.stop();
      if (recording.transcribing) discardWorker();
    }
    idle();
  }

  function done(recording,message) {
    if (recording !== session) return;
    session = undefined;
    release(recording);
    idle();
    status.textContent = message;
  }

  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./transcriber.mjs',import.meta.url),{type:'module'});
    worker.addEventListener('message', ({data}) => {
      const recording = pending;
      if (!recording || recording.id !== data.id || recording !== session) return;
      if (data.phase === 'loading') {
        status.textContent = 'Preparing voice recognition. The first download can take a minute.';
      } else if (data.phase === 'transcribing') {
        status.textContent = 'Transcribing your recording…';
      } else {
        pending = undefined;
        const text = data.text?.trim()?.slice(0,600);
        if (text) {
          done(recording,'Review the transcript and any details Hemline filled in.');
          onTranscript(text);
        } else if (data.error) {
          discardWorker();
          done(recording,'Voice recognition could not load. Check your connection and tap Speak to retry.');
        } else {
          done(recording,'No speech was recognised. Try speaking again or type your request.');
        }
      }
    });
    worker.addEventListener('error', () => {
      const recording = pending;
      discardWorker();
      if (recording) done(recording,'Voice recognition could not start on this device. Try again or type your request.');
    });
    return worker;
  }

  async function transcribe(recording) {
    release(recording);
    if (session !== recording) return;
    button.disabled = true;
    button.textContent = 'Transcribing…';
    button.setAttribute('aria-pressed','false');
    status.textContent = 'Reading your recording…';
    try {
      if (!recording.chunks.length) {
        done(recording,'No audio was recorded. Try speaking again.');
        return;
      }
      const audio = await decodeAudio(new Blob(recording.chunks,{type:recording.recorder.mimeType}));
      if (session !== recording) return;
      if (audio.length < 4000 || isQuiet(audio)) {
        done(recording,'No speech was detected. Try speaking closer to the microphone.');
        return;
      }
      pending = recording;
      recording.transcribing = true;
      recording.timer = setTimeout(() => {
        discardWorker();
        done(recording,'Voice recognition took too long. Tap Speak to retry.');
      },120000);
      getWorker().postMessage({id:recording.id,audio},[audio.buffer]);
    } catch {
      discardWorker();
      done(recording,'The recording could not be read. Try again or type your request.');
    }
  }

  async function start() {
    const recording = {id:++nextId,chunks:[]};
    session = recording;
    button.disabled = true;
    status.textContent = 'Waiting for microphone permission…';
    try {
      recording.stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (session !== recording) {
        release(recording);
        return;
      }
      recording.recorder = new MediaRecorder(recording.stream);
      recording.recorder.addEventListener('dataavailable', ({data}) => {
        if (data.size > 0) recording.chunks.push(data);
      });
      recording.recorder.addEventListener('stop', () => transcribe(recording),{once:true});
      recording.recorder.addEventListener('error', () => {
        done(recording,'Recording was interrupted. Tap Speak to try again.');
      },{once:true});
      recording.recorder.start();
      button.disabled = false;
      button.textContent = 'Stop and transcribe';
      button.setAttribute('aria-pressed','true');
      status.textContent = 'Recording. Tap Stop and transcribe when you finish.';
      recording.timer = setTimeout(() => {
        if (recording.recorder.state === 'recording') recording.recorder.stop();
      },30000);
    } catch (error) {
      done(recording,permissionMessage(error));
    }
  }

  idle();
  if (!supported) status.textContent = 'This browser cannot record audio. Open Hemline in your regular browser or type your request.';
  button.addEventListener('click', () => {
    if (session?.recorder?.state === 'recording') {
      button.disabled = true;
      session.recorder.stop();
    } else if (!session && supported) {
      void start();
    }
  });
  window.addEventListener('pagehide',reset);
  return reset;
}
