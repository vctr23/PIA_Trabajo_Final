import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increased limit for image base64 data
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/classify", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Prepare content for Gemini
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: image.split(",")[1], // Remove the data:image/jpeg;base64, prefix
      },
    };

    const textPart = {
      text: "Actúa como un experto nutricionista y chef. Identifica el plato de comida en esta imagen. Devuelve un objeto JSON con el nombre del plato, una breve descripción, ingredientes principales, estimación de calorías y macronutrientes (proteínas, carbohidratos, grasas). Responde siempre en español.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plato: { type: Type.STRING, description: "Nombre del plato" },
            descripcion: { type: Type.STRING, description: "Breve descripción" },
            ingredientes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de ingredientes" },
            calorias: { type: Type.STRING, description: "Calorías aprox" },
            macronutrientes: {
                type: Type.OBJECT,
                properties: {
                    proteinas: { type: Type.STRING },
                    carbohidratos: { type: Type.STRING },
                    grasas: { type: Type.STRING }
                }
            }
          },
          required: ["plato", "descripcion", "ingredientes", "calorias"]
        }
      }
    });

    const result = JSON.parse(response.text);
    res.json(result);
  } catch (error) {
    console.error("Classification error:", error);
    res.status(500).json({ error: "Failed to classify image" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
