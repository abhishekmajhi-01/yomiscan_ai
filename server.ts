import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Allow up to 30mb payload for image processing & OCR requests
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Health and AI status check endpoint
app.get('/api/ai/status', (_req, res) => {
  res.json({
    available: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash',
  });
});

// Helper to sanitize base64
function extractBase64Data(dataUriOrBase64: string): { mimeType: string; data: string } {
  if (dataUriOrBase64.startsWith('data:')) {
    const matches = dataUriOrBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return { mimeType: matches[1], data: matches[2] };
    }
  }
  return { mimeType: 'image/jpeg', data: dataUriOrBase64 };
}

// 1. OCR - High precision extraction with structure detection
app.post('/api/gemini/ocr', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { image, language = 'English' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const { mimeType, data } = extractBase64Data(image);

    const prompt = `Perform accurate Optical Character Recognition (OCR) on this scanned document image.
Target primary language: ${language} (preserve all characters in English, Hindi, Telugu, or any other visible script accurately).

Instructions:
1. Extract ALL text faithfully, preserving reading flow, headings, paragraphs, lists, and tabular data.
2. Identify and return:
   - Full extracted text (clean, markdown-formatted)
   - Detected headings
   - Detected lists / bullet points
   - Extracted key numbers (amounts, serial numbers, codes)
   - Extracted dates
   - Extracted people / entity names
   - Summary of detected language(s)
3. Return the response strictly as valid JSON adhering to the provided schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullText: { type: Type.STRING, description: 'The complete extracted text formatted cleanly' },
            headings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Major section titles and headers',
            },
            lists: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Extracted list items or bullet lines',
            },
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key numbers, IDs, prices, codes found',
            },
            dates: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Dates found in the document',
            },
            names: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Names of people, organizations, or institutions',
            },
            detectedLanguages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Languages detected (e.g. English, Hindi, Telugu)',
            },
          },
          required: ['fullText', 'headings', 'numbers', 'dates', 'names'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('OCR Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to perform OCR.' });
  }
});

// 2. AI Document Classification
app.post('/api/gemini/classify', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { image, text } = req.body;
    const parts: any[] = [];

    if (image) {
      const { mimeType, data } = extractBase64Data(image);
      parts.push({ inlineData: { mimeType, data } });
    }

    parts.push({
      text: `Analyze this document and classify it accurately.
Text snippet (if available): ${text ? text.slice(0, 1000) : 'None'}

Allowed categories:
"ID", "Receipt", "Invoice", "Certificate", "Assignment", "Notes", "Book page", "Bill", "Bank document", "Business card", "Legal document", "Personal document", "Other"

Suggest a smart, clear filename (e.g. "Electricity_Bill_Sep_2026.pdf" or "College_Certificate_Abhishek.pdf") and 3-5 relevant searchable tags.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: 'Confidence between 0 and 1' },
            suggestedFileName: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING },
          },
          required: ['category', 'suggestedFileName', 'tags'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Classify Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to classify document.' });
  }
});

// 3. Document Assistant (Q&A, Summarize, Translate, Key Info)
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { query, documentText, image, action } = req.body;
    const parts: any[] = [];

    if (image) {
      const { mimeType, data } = extractBase64Data(image);
      parts.push({ inlineData: { mimeType, data } });
    }

    const contextText = documentText ? `\n--- Document OCR Text ---\n${documentText}\n-------------------------\n` : '';

    let taskInstruction = '';
    if (action === 'summarize') {
      taskInstruction = 'Provide a clear, structured summary of this document. Include main points, key figures, dates, and action items.';
    } else if (action === 'translate') {
      taskInstruction = `Translate the document content into the requested language or format: "${query}". Keep formatting clean.`;
    } else if (action === 'extract-entities') {
      taskInstruction = 'Extract all names, dates, amounts, addresses, email addresses, phone numbers, and reference numbers found in the document.';
    } else {
      taskInstruction = `Answer the following question about this document: "${query}".
CRITICAL: Only use information available in this document. If the answer cannot be determined from the document, explicitly state that the information was not found.`;
    }

    parts.push({ text: `${contextText}\n\nTask:\n${taskInstruction}` });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        temperature: 0.2,
      },
    });

    return res.json({ answer: response.text });
  } catch (err: any) {
    console.error('Assistant Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to run document assistant.' });
  }
});

// 4. Structured Information Extraction (Receipts, Invoices, IDs, Business Cards, Certificates)
app.post('/api/gemini/extract-info', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { type, image, text } = req.body;
    const parts: any[] = [];

    if (image) {
      const { mimeType, data } = extractBase64Data(image);
      parts.push({ inlineData: { mimeType, data } });
    }

    const prompt = `Extract all structured fields for a document of type "${type}".
Text provided: ${text ? text.slice(0, 1500) : 'None'}.
Be precise and leave unknown fields empty or null.`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  key: { type: Type.STRING },
                  value: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['label', 'key', 'value'],
              },
            },
            structuredData: {
              type: Type.OBJECT,
              properties: {
                // Receipt / Invoice
                storeOrVendor: { type: Type.STRING },
                invoiceNumber: { type: Type.STRING },
                date: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                subtotal: { type: Type.STRING },
                tax: { type: Type.STRING },
                totalAmount: { type: Type.STRING },
                currency: { type: Type.STRING },
                paymentMethod: { type: Type.STRING },
                // Business Card
                name: { type: Type.STRING },
                company: { type: Type.STRING },
                jobTitle: { type: Type.STRING },
                phoneNumber: { type: Type.STRING },
                email: { type: Type.STRING },
                website: { type: Type.STRING },
                address: { type: Type.STRING },
                // ID Card / Certificate
                idType: { type: Type.STRING },
                idNumber: { type: Type.STRING },
                dob: { type: Type.STRING },
                expiryDate: { type: Type.STRING },
                institution: { type: Type.STRING },
                certificateTitle: { type: Type.STRING },
              },
            },
          },
          required: ['documentType', 'fields'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Extract Info Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract structured information.' });
  }
});

// 5. Table Extraction (Rows, Columns, Cell Contents, CSV/JSON ready)
app.post('/api/gemini/extract-table', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const { image, text } = req.body;
    const parts: any[] = [];

    if (image) {
      const { mimeType, data } = extractBase64Data(image);
      parts.push({ inlineData: { mimeType, data } });
    }

    parts.push({
      text: `Identify any tables present in this document.
Extract:
1. Table headers
2. All rows with cell contents
3. Preserved table structure
${text ? `Document text:\n${text}` : ''}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasTable: { type: Type.BOOLEAN },
            tableName: { type: Type.STRING },
            headers: { type: Type.ARRAY, items: { type: Type.STRING } },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            summary: { type: Type.STRING },
          },
          required: ['hasTable', 'headers', 'rows'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Table Extraction Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to extract table.' });
  }
});

// 6. AI Auto-Enhance recommendation
app.post('/api/gemini/auto-enhance', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        recommendedFilter: 'auto',
        brightness: 10,
        contrast: 20,
        sharpness: 15,
        shadowRemoval: true,
        noiseReduction: true,
      });
    }

    const { image } = req.body;
    const { mimeType, data } = extractBase64Data(image);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          {
            text: `Analyze this scanned document image quality (lighting, shadows, contrast, text sharpness, background noise).
Recommend the optimal enhancement settings.
Choose filter from: "original", "auto", "bw" (black & white for text), "grayscale", "color", "high-contrast".
Brightness adjustment: -50 to 50
Contrast adjustment: -50 to 50
Sharpness: 0 to 50
Shadow removal: boolean
Noise reduction: boolean`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedFilter: { type: Type.STRING },
            brightness: { type: Type.NUMBER },
            contrast: { type: Type.NUMBER },
            sharpness: { type: Type.NUMBER },
            shadowRemoval: { type: Type.BOOLEAN },
            noiseReduction: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
          },
          required: ['recommendedFilter', 'brightness', 'contrast'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    return res.json({
      recommendedFilter: 'auto',
      brightness: 10,
      contrast: 20,
      sharpness: 15,
      shadowRemoval: true,
      noiseReduction: true,
    });
  }
});

// 7. Duplicate / Similarity check
app.post('/api/gemini/duplicate-check', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { newDocText, existingDocs } = req.body;

    if (!ai || !existingDocs || existingDocs.length === 0 || !newDocText) {
      return res.json({ isDuplicate: false });
    }

    const prompt = `Compare this newly scanned document text with the existing documents list:
NEW DOCUMENT TEXT:
${newDocText.slice(0, 1000)}

EXISTING DOCUMENTS:
${existingDocs.map((d: any, idx: number) => `[Doc ${idx + 1} ID: ${d.id}, Title: "${d.title}"]:\n${(d.ocrText || '').slice(0, 500)}`).join('\n\n')}

Determine if the new document is likely a duplicate (or updated scan) of any existing document.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDuplicate: { type: Type.BOOLEAN },
            matchedDocId: { type: Type.STRING },
            matchedTitle: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
          },
          required: ['isDuplicate'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"isDuplicate": false}');
    return res.json(parsed);
  } catch (err: any) {
    return res.json({ isDuplicate: false });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`YomiScan Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
