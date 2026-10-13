export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ status: "ok", app: "حقوق کربلایی", ai: "Groq API", configured: Boolean(env.AI_API_KEY), model: env.AI_MODEL || "openai/gpt-oss-20b" }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
