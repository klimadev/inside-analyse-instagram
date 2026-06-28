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

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1"
          }
        }
      });

      let base64Image = null;
      if (response.candidates && response.candidates.length > 0) {
         for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
               base64Image = part.inlineData.data;
               break;
            }
         }
      }
      
      if (!base64Image) {
         return res.status(500).json({ error: "No image generated" });
      }

      res.json({ base64: `data:image/jpeg;base64,${base64Image}` });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error?.message || "Failed to generate image" });
    }
  });

  app.post("/api/edit-profile-image", async (req, res) => {
    try {
      const { imageBase64, prompt } = req.body;
      if (!imageBase64 || !prompt) {
        return res.status(400).json({ error: "Missing imageBase64 or prompt" });
      }

      const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]*;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let editedImageBase64 = null;
      if (response.candidates && response.candidates.length > 0) {
         for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
               editedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
               break;
            }
         }
      }

      if (!editedImageBase64) {
         return res.status(500).json({ error: "No image generated" });
      }

      res.json({ base64: editedImageBase64 });
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
