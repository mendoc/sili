import type { Context } from "@netlify/functions"
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import TelegramBot from "node-telegram-bot-api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const MODEL_NAME = "gemini-pro";
const THEME = "Technologie et programmation";

export default async (req: Request, context: Context) => {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
        temperature: 0.8,
        topK: 0,
        topP: 0.95,
        maxOutputTokens: 8192
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
        { text: `Génère une question de QCM aléatoire avec trois propositions de réponses sur plusieurs thématiques diverses et variées. Indique quelle est la bonne réponse parmi les trois (0, 1 ou 2) et fournis une explication. Formate le tout en JSON selon la structure suivante : {question, options, response, explanation}. La question ne doit pas dépasser 250 caractères. L'explication ne doit pas dépasser 180 caractères.` },
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
        responseObj.question,
        responseObj.options,
        { type: "quiz", correct_option_id: responseObj.response, explanation: responseObj.explanation }
    );

    return Response.json(responseObj);
}
