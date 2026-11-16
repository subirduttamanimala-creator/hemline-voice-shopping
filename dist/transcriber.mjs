let model;

self.addEventListener('message', async ({data:{id,audio}}) => {
  try {
    if (!model) {
      self.postMessage({id,phase:'loading'});
      model = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js')
        .then(({env,pipeline}) => {
          env.backends.onnx.wasm.numThreads = 1;
          return pipeline('automatic-speech-recognition','onnx-community/whisper-tiny.en',{
            device:'wasm',dtype:'q8'
          });
        });
    }
    const transcribe = await model;
    self.postMessage({id,phase:'transcribing'});
    const result = await transcribe(audio);
    self.postMessage({id,text:result.text.trim()});
  } catch {
    model = undefined;
    self.postMessage({id,error:true});
  }
});
