import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // --- API Routes ---

  app.post("/api/analyze", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64" });
      }

      const promptContents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
                mimeType: "image/jpeg",
              },
            },
            {
              text: `Analise este perfil do Instagram. Identifique desalinhamentos, erros na bio e problemas estéticos. Retorne um JSON estrito com os pontos fracos e plano de ação.
Formato esperado:
{
  "marca_nome": "Nome Detectado",
  "bio_atual": "Texto da biografia atual",
  "diagnostico": {
    "biografia": "Por que está ruim e o que afasta clientes",
    "identidade_visual": "Problemas de contraste, fontes e logos sem nexo",
    "grade_posts": "Desalinhamentos nos posts visíveis"
  },
  "plano_acao": [
    "Ação 1: ...",
    "Ação 2: ..."
  ]
}
Responda APENAS com o JSON, sem markdown \`\`\`json ou texto adicional.`,
            },
          ],
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptContents as any,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      });

      const jsonString = response.text;
      res.json(JSON.parse(jsonString || "{}"));
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  app.post("/api/rebrand", async (req, res) => {
    try {
      const { analysis, feedback } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Você é um especialista em branding.
Com base no diagnóstico atual: ${JSON.stringify(analysis)}
E neste feedback do usuário (se houver): ${feedback || "Nenhum"}

Crie as diretrizes de escrita e design (BRANDING e DESIGN) e o conteúdo para o novo perfil do Instagram.
Também crie prompts em INGLÊS muito específicos para gerar as imagens do novo perfil.

Formato esperado:
{
  "branding_md": "# Branding\\n\\nRegras de voz e tom...",
  "design_md": "# Design\\n\\nRegras visuais, tipografia...",
  "novo_perfil": {
    "novo_user": "@nomedamarca_oficial",
    "nova_bio": "Frase de efeito.\\n👇 Link importante aqui.",
    "seguidores": "14.2k",
    "paleta_cores": ["#0F172A", "#F8FAFC", "#F59E0B"],
    "logo_prompt": "A minimalist and modern logo for a brand named X, flat vector style, solid background",
    "destaques": [
      { "titulo": "Comece Aqui", "prompt": "A minimalist story highlight icon representing a star, flat style, solid background" },
      { "titulo": "Clientes", "prompt": "A minimalist story highlight icon representing people, flat style, solid background" }
    ],
    "posts_prompts": [
      "A professional instagram post image about marketing tips, modern minimal style",
      "A stylish flat lay of office desk with laptop and coffee, modern aesthetic",
      "A bold typographic instagram post background with subtle geometric patterns"
    ]
  }
}
Responda APENAS com o JSON, sem markdown ou texto adicional.`,
              },
            ],
          },
        ],
        config: {
            temperature: 0.4,
            responseMimeType: "application/json",
        }
      });

      const jsonString = response.text;
      res.json(JSON.parse(jsonString || "{}"));
    } catch (error) {
      console.error("Error generating rebrand:", error);
      res.status(500).json({ error: "Failed to generate rebrand" });
    }
  });

  const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run`;
  const CF_AUTH = () => `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`;

  // ponytail: txt2img models confirmed working with JSON (no multipart needed)
  const TXT2IMG_MODELS = [
    { id: "@cf/stabilityai/stable-diffusion-xl-base-1.0",          name: "SDXL Base" },
    { id: "@cf/black-forest-labs/flux-1-schnell",                  name: "Flux 1 Schnell" },
    { id: "@cf/bytedance/stable-diffusion-xl-lightning",            name: "SDXL Lightning" },
    { id: "@cf/lykon/dreamshaper-8-lcm",                           name: "Dreamshaper 8" },
    { id: "@cf/leonardo/phoenix-1.0",                              name: "Phoenix 1.0" },
    { id: "@cf/leonardo/lucid-origin",                             name: "Lucid Origin" },
  ];

  async function cfImage(model: string, body: Record<string, unknown>): Promise<string> {
    const resp = await fetch(`${CF_BASE}/${model}`, {
      method: "POST",
      headers: { Authorization: CF_AUTH(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown error");
      throw new Error(`CF Workers AI error (${resp.status}): ${errText.slice(0, 200)}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  }

  // txt2img — gera com todos os modelos em paralelo
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, width, height, negative_prompt, guidance, num_steps } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const tasks = TXT2IMG_MODELS.map(m => async () => {
        try {
          const base64 = await cfImage(m.id, {
            prompt,
            width: width || 1024,
            height: height || 1024,
            negative_prompt: negative_prompt || "",
            guidance: guidance || 7.5,
            num_steps: num_steps || 20,
          });
          return { model: m.name, modelId: m.id, base64 };
        } catch (e: any) {
          console.error(`  ${m.name} failed:`, e.message);
          return null;
        }
      });

      const results = (await Promise.all(tasks.map(t => t()))).filter(Boolean);
      if (results.length === 0) {
        return res.status(500).json({ error: "All models failed to generate" });
      }

      res.json({ results });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error?.message || "Failed to generate image" });
    }
  });

  // img2img — SD 1.5 (único modelo CF com img2img funcional, 512x512)
  app.post("/api/edit-profile-image", async (req, res) => {
    try {
      const { imageBase64, prompt, strength, negative_prompt } = req.body;
      if (!imageBase64 || !prompt) {
        return res.status(400).json({ error: "Missing imageBase64 or prompt" });
      }

      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, "");

      const base64 = await cfImage("@cf/runwayml/stable-diffusion-v1-5-img2img", {
        prompt,
        image_b64: base64Data,
        strength: strength ?? 0.8,
        width: 512,
        height: 512,
        negative_prompt: negative_prompt || "",
      });

      res.json({ base64 });
    } catch (error: any) {
      console.error("Error editing image:", error);
      res.status(500).json({ error: error?.message || "Failed to edit image" });
    }
  });

  app.post("/api/copilot", async (req, res) => {
    try {
      const { prompt, branding, design } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Você é um assistente Copilot de Branding.
Diretrizes da marca (BRANDING): ${branding}
Regras visuais (DESIGN): ${design}

O usuário pediu: "${prompt}"

Com base nas regras da marca, crie um plano de conteúdo estruturado. Se o usuário pedir um carrossel ou posts, gere o texto de cada slide/post e o prompt da imagem (em inglês) para gerarmos a arte.

Responda num formato JSON assim:
{
  "mensagem": "Certo, criei um carrossel de 3 slides sobre o assunto X com base no seu tom de voz amigável.",
  "itens_gerados": [
    {
      "tipo": "slide",
      "texto": "Texto sobreposto na imagem",
      "legenda": "Legenda do post (opcional)",
      "imagem_prompt": "A modern and clean background image for an instagram carousel slide about X, aligned with the brand..."
    }
  ]
}
Responda APENAS com o JSON.`,
              },
            ],
          },
        ],
        config: {
             temperature: 0.7,
             responseMimeType: "application/json",
        }
      });

      const jsonString = response.text;
      res.json(JSON.parse(jsonString || "{}"));
    } catch (error) {
      console.error("Error in copilot:", error);
      res.status(500).json({ error: "Copilot failed" });
    }
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
