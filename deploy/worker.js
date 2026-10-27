// KhmerClip is a static frontend; the Worker only serves the built assets.
// The AI model runs on the user's own Colab/Kaggle T4 GPU.
export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("Assets binding is missing", { status: 500 });
    }
    return env.ASSETS.fetch(request);
  },
};
