import { GoogleGenAI } from "@google/genai";

// Initialize the AI client lazily to ensure environment variables are loaded
let aiClient: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!aiClient) {
    // Try multiple sources for the API key
    const key = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                (typeof process !== 'undefined' && process.env?.API_KEY) ||
                (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_GEMINI_API_KEY) ||
                (window as any).process?.env?.GEMINI_API_KEY ||
                (window as any).process?.env?.API_KEY;
                
    if (!key) {
      console.error("Gemini API Key is missing. Please check your environment variables.");
    } else {
      console.log("Gemini API Key resolved (length):", key.length);
    }
    
    aiClient = new GoogleGenAI({ apiKey: key || 'MISSING_KEY' });
  }
  return aiClient;
};

export interface MarketPriceResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export interface Attachment {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export interface ExpertResponse {
  text: string;
  sources: { uri: string; title: string }[];
}

export interface WeatherAdvice {
  location: string;
  temp: string;
  humidity: string;
  condition: string;
  broodingTip: string;
  generalTip: string;
}

export const askPoultryExpert = async (question: string, attachments: Attachment[] = [], language: string = 'English'): Promise<ExpertResponse> => {
  try {
    // Upgraded to gemini-flash-latest for better reasoning + tools support + multimodal input
    const model = 'gemini-flash-latest'; 
    
    let languageInstruction = "";
    if (language === 'Hindi') {
        languageInstruction = "IMPORTANT: You MUST reply in HINDI (Devanagari script). Even if the user asks in English, your output MUST be in Hindi. Use simple farming language. You can keep specific medical names in English brackets if needed.";
    } else if (language === 'Marathi') {
        languageInstruction = "IMPORTANT: You MUST reply in MARATHI. Even if the user asks in English, your output MUST be in Marathi. Use local poultry terms like 'Kombdi', 'Kuduk', 'Khadya'.";
    } else {
        languageInstruction = "Reply in English. You can use common Indian poultry terms like 'Kuduk', 'Desi' where appropriate.";
    }

    const systemInstruction = `You are "PoultryMitra", an expert AI consultant for Indian Poultry Farming.
    
    Your knowledge base includes:
    1. Breeds: Gavran, Aseel, Kadaknath, Black Australorp, RIR, Sonali, Kaveri, Vanaraja, Giriraja, Ducks (Khaki/Pekin), Turkey, Guinea Fowl (Titari), and Columbian Brahma.
    2. Management: Low-cost "Jugaad" brooding, vaccination schedules, feed formulation.
    3. Disease: Symptoms and remedies (Natural/Allopathic).
    4. Business: Profit calculation, marketing.

    Rules:
    - ${languageInstruction}
    - Provide detailed, structured answers with Markdown (Bold key terms, use Bullet points).
    - If analyzing an image, describe what you see first.
    - Always advise consulting a vet for serious diseases.
    - Use the Search tool to find latest prices or specific treatments if needed.
    `;

    // Construct parts: Attachments + Text
    const parts: any[] = [];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        parts.push(att);
      });
    }

    // Append language context to the prompt as well to ensure adherence
    parts.push({ text: `${question} (Please answer in ${language})` });

    const config: any = {
      systemInstruction,
    };

    // Google Search grounding might not work well with image inputs in this model version
    // Temporarily disabling to troubleshoot 502 errors
    /*
    if (!attachments || attachments.length === 0) {
      config.tools = [{ googleSearch: {} }];
    }
    */

    const response = await getAIClient().models.generateContent({
      model,
      contents: { parts },
      config
    });

    // Extract sources from grounding metadata
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web)
      .map((web: any) => ({ uri: web.uri, title: web.title })) || [];

    return {
      text: response.text || "Sorry, I couldn't generate a response.",
      sources
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { 
      text: `Failed to connect to the Poultry Expert AI. Error: ${error.message || 'Unknown error'}. Please try again later or check your network.`, 
      sources: [] 
    };
  }
};

export const fetchRealTimePrices = async (breed: string, location: string): Promise<MarketPriceResult> => {
  try {
    const model = 'gemini-flash-latest';
    
    const searchQuery = location === 'All India' 
      ? `latest wholesale and retail market prices (in ₹/kg) for ${breed} chicken/poultry in India today state wise`
      : `latest wholesale and retail market prices (in ₹/kg) for ${breed} chicken/poultry in ${location}, India today`;

    const response = await getAIClient().models.generateContent({
      model,
      contents: `Search for the ${searchQuery}. 
      Return the data as a concise Markdown list. 
      Format:
      * **[City/Mandi Name]**: ₹[Price]/kg ([Trend if available])
      
      Limit to top 5 relevant locations.`,
      config: {
        // Temporarily disabling googleSearch to troubleshoot 502 errors
        // tools: [{ googleSearch: {} }],
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web)
      .map((web: any) => ({ uri: web.uri, title: web.title })) || [];

    return {
      text: response.text || "No market data found for this breed.",
      sources
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return { text: "Failed to fetch live prices. Please check your internet connection.", sources: [] };
  }
};

export const generateSalesStrategy = async (
  data: {
    breed: string,
    location: string,
    costPerKg: number,
    totalBirds: number,
    marketInfo: string
  }
): Promise<string> => {
  try {
    const model = 'gemini-flash-latest';
    const prompt = `
      You are a Poultry Business Strategist. Provide a very short, actionable plan for a farmer in ${data.location}.

      **Farm Status:**
      - Breed: ${data.breed} | Qty: ${data.totalBirds}
      - Breakeven Cost: ₹${data.costPerKg.toFixed(2)}/kg
      
      **Market Intel:**
      ${data.marketInfo}

      **Response Format (Markdown):**
      
      ### 🎯 Recommendation: [SELL NOW / HOLD / WAIT]

      **💰 Pricing Target**
      *   **Ideal Selling Price:** ₹[Price]/kg
      *   **Exp. Net Profit:** ₹[Amount]/kg

      **⚡ Strategy Note**
      [1-2 short sentences on why. Mention local trend if any.]
      
      **⚠️ Quick Tip**
      [One short tip to maximize value, e.g. "Sell birds > 1.5kg first"]
    `;

    const response = await getAIClient().models.generateContent({
      model,
      contents: prompt,
      config: {
        // Removed invalid thinkingConfig
      }
    });

    return response.text || "Could not generate strategy.";
  } catch (error) {
    console.error("Strategy Gen Error:", error);
    return "Failed to generate sales strategy.";
  }
};

export const generateFarmingImage = async (prompt: string): Promise<string | null> => {
  try {
    const model = 'gemini-2.5-flash-image';
    const response = await getAIClient().models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    return null;
  }
};

export const getWeatherAndBroodingAdvice = async (location: string): Promise<WeatherAdvice | null> => {
    try {
        const model = 'gemini-flash-latest';
        const prompt = `
        Search for the current weather (Temperature in Celsius, Humidity, and Condition) in ${location}.
        Based on this weather, provide:
        1. A specific tip for poultry brooding (chick care) right now.
        2. A general tip for adult bird management.
        
        Return the result as a raw JSON object (NO markdown formatting).
        Schema:
        {
            "location": "${location}",
            "temp": "e.g. 32°C",
            "humidity": "e.g. 60%",
            "condition": "e.g. Sunny",
            "broodingTip": "Advice for brooding based on temp...",
            "generalTip": "Advice for flock..."
        }
        `;

        const response = await getAIClient().models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        const text = response.text;
        if(text) {
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : text;
            return JSON.parse(jsonString) as WeatherAdvice;
        }
        return null;
    } catch (error) {
        console.error("Weather Fetch Error", error);
        return null;
    }
};

export const generateBusinessPlan = async (
    location: string, 
    locationType: 'Village' | 'City', 
    budget: number, 
    landType: string
): Promise<string> => {
    try {
        const model = 'gemini-flash-latest';
        const prompt = `
        You are a Poultry Business Expert for India. Create a low-cost, high-profit business plan.
        
        **User Details:**
        - Location: ${location} (${locationType})
        - Budget: ₹${budget}
        - Land/Space: ${landType}

        **Task:**
        Create a markdown plan focusing on "Jugaad" (Low cost innovation) to start within this budget.
        
        **Required Sections:**
        1. **💰 Budget Allocation:** Break down the ₹${budget} into Shed (Bamboo/Scrap), Chicks, Feed, Meds.
        2. **🏠 Shed Strategy:** How to build a shed cheaply in a ${locationType} setting? (e.g. Bamboo, Used Net).
        3. **💸 Multiple Income Streams:** Apart from meat/eggs, list 3 other ways to earn from this batch (e.g. Selling Manure/Khad, Gunny bags, Feathers, Trading).
        4. **📉 Cost Cutting:** One specific tip to reduce Feed cost using local resources in ${location}.
        `;

        const response = await getAIClient().models.generateContent({
            model,
            contents: prompt,
        });

        return response.text || "Could not generate plan.";
    } catch (error) {
        console.error("Plan Gen Error:", error);
        return "Failed to generate business plan.";
    }
};

export const getMarketForecast = async (location: string, breed: string): Promise<string> => {
    try {
        const model = 'gemini-flash-latest';
        const prompt = `
        Act as a Poultry Market Analyst for ${location}, India.
        
        **Task:**
        Analyze the market demand for ${breed} for the next 3 months.
        Use Google Search to find upcoming festivals (Hindu/Muslim/Christian) in India that affect poultry demand.

        **Output Format (Markdown):**
        1. **📊 Demand Radar:** Is demand High, Medium, or Low currently?
        2. **🗓️ Best Time to Sell:** List specific upcoming dates/festivals (e.g. Holi, Eid, New Year) when prices will peak.
        3. **💵 Price Range:** Expected Min and Max Wholesale Price (₹/kg) in ${location}.
        4. **🤝 Buyer Types:** List 3 types of buyers the farmer should contact (e.g. Dhaba, Whole-seller, Retailer) specific to ${breed}.
        `;

        const response = await getAIClient().models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return response.text || "Could not generate forecast.";
    } catch (error) {
        console.error("Forecast Error:", error);
        return "Failed to fetch market forecast.";
    }
};