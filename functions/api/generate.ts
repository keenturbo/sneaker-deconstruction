import type { RequestHandler } from "@cloudflare/workers-types";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const DEFAULT_API_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function callGeminiImage(apiUrl: string, apiKey: string, prompt: string, imageBase64: string) {
  const url = `${apiUrl}?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      candidateCount: 1,
      responseModalities: ["IMAGE"],
      temperature: 0.6,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
  } as const;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inline = part?.inlineData;
    if (inline?.data) {
      return { base64: inline.data, mime: inline.mimeType || "image/png" };
    }
  }

  for (const part of parts) {
    if (typeof part?.text === "string" && part.text.trim()) {
      try {
        const parsed = JSON.parse(part.text);
        if (parsed.base64) {
          return { base64: parsed.base64, mime: parsed.mime || "image/png" };
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  throw new Error("Gemini 响应缺少图片数据");
}

function buildPrompt(name?: string) {
  const title = (name || "Sneaker").trim() || "Sneaker";
  return `Generate one ultra-realistic PNG image only. Do not return text. Follow strictly:
# Role: Master Sneaker Designer & Engineer

# Task:
Analyze the uploaded sneaker photo, preserve its colorway and materials, then render a vertical exploded/deconstructed view.

# Visual Structure:
- **Background:** Pure black (#000000).
- **Layout:** Strict single vertical stack, evenly spaced layers.
- **Layers (Top→Bottom):**
  1) Laces/Tongue/Collar padding
  2) Upper panels & overlays
  3) Support/heel counter/lining
  4) Midsole & cushioning system
  5) Outsole with tread pattern
  6) Complete sneaker at bottom
- Orientation: Single column, no split screen, centered.

# Styling:
- Industrial product render, 8k studio lighting, rim lights, sharp edges.
- Keep the original sneaker's silhouette, colorway, branding hints (no text logos).
- Pure black background, high contrast, subtle fog/particles allowed.
- Optional minimal labels: bilingual CN/EN if needed, thin lines, unobtrusive.

# Constraints:
- Do NOT add human figures.
- Do NOT change the sneaker model or colorway.
- Return only the final rendered image as inlineData.

# User Input:
- Sneaker name (optional): ${title}
- Use it only to guide authenticity and materials.
`;
}

export const onRequestPost: RequestHandler = async ({ request, env }) => {
  try {
    const { image_base64, shoe_name } = await request.json<any>();
    if (!image_base64 || typeof image_base64 !== "string" || !image_base64.trim()) {
      return new Response(JSON.stringify({ error: "缺少必填参数 image_base64" }), { status: 400 });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "缺少 GEMINI_API_KEY" }), { status: 500 });
    }

    const model = env.AI_MODEL_NAME || DEFAULT_MODEL;
    const apiUrl = env.AI_MODEL_URL || DEFAULT_API_URL(model);

    const prompt = buildPrompt(shoe_name);
    const { base64, mime } = await callGeminiImage(apiUrl, apiKey, prompt, image_base64);
    const imageUrl = `data:${mime};base64,${base64}`;

    return new Response(JSON.stringify({ image_url: imageUrl, style: "sneaker_deconstruction" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "未知错误" }), { status: 500 });
  }
};
