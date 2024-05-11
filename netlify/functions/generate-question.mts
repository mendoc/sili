import type { Context } from "@netlify/functions"
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import TelegramBot from "node-telegram-bot-api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const MODEL_NAME = "gemini-pro";
const DEFAULT_THEME: string = "Culture générale";
const DEFAULT_TEMP: string = "0.8";
const PROMPT: string = "Génère une question de QCM aléatoire avec trois propositions de réponses sur plusieurs thématiques diverses et variées. Indique quelle est la bonne réponse parmi les trois (0, 1 ou 2) et fournis une explication. Formate le tout en JSON selon la structure suivante : {question, options, response, explanation}. La question ne doit pas dépasser 250 caractères. L'explication ne doit pas dépasser 180 caractères.";

export default async (req: Request, context: Context) => {

    const params: URLSearchParams = new URL(req.url).searchParams;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const siliTheme: string = params.get("theme") || process.env.SILI_THEME as string || DEFAULT_THEME;
    const geminiTemperature: unknown = params.get("temp") || process.env.GEMINI_TEMP as string || DEFAULT_TEMP;
    const geminiTopK: unknown = process.env.GEMINI_TOP_K || 0;
    const geminiTopP: unknown = process.env.GEMINI_TOP_P || 0.95;
    const geminiMaxOutputTokens: unknown = process.env.GEMINI_MAX_OUTPUT_TOKENS || 8192;
    let geminiPrompt: string = process.env.GEMINI_PROMPT || PROMPT;

    geminiPrompt = geminiPrompt.replace("{{THEME}}", siliTheme);

    console.log("theme:", siliTheme);
    console.log("temp:", geminiTemperature);

    const generationConfig = {
        temperature: geminiTemperature as number,
        topK: geminiTopK as number,
        topP: geminiTopP as number,
        maxOutputTokens: geminiMaxOutputTokens as number
    };

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];

    const parts = [
        { text: geminiPrompt },
    ];

    const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
        safetySettings,
    });

    const response = await result.response;
    const responseObj = JSON.parse(response.text().replace(/`json|\n|`/g, ""));
    console.log(responseObj);


    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string);
    await bot.sendPoll(
        process.env.TELEGRAM_CHAT_ID as string,
        responseObj.question.substring(0, 300),
        responseObj.options,
        { type: "quiz", correct_option_id: responseObj.response, explanation: responseObj.explanation.substring(0, 200) }
    );

    return Response.json(responseObj);
}
