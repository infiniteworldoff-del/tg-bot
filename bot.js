import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_TOKEN);
const GEMINI_KEY = process.env.GEMINI_KEY;
const MODEL = "gemini-flash-lite-latest";
const SYSTEM_PROMPT = "Ты дружелюбный помощник в Telegram. Отвечай кратко и по делу.";

const histories = new Map();
const MAX_MESSAGES = 20;

bot.command("start", (ctx) => ctx.reply("Привет! Напиши мне что-нибудь, и я отвечу."));
bot.command("reset", (ctx) => {
  histories.delete(ctx.chat.id);
  return ctx.reply("История очищена.");
});

bot.on("message:text", async (ctx) => {
  const id = ctx.chat.id;
  const history = histories.get(id) ?? [];
  history.push({ role: "user", parts: [{ text: ctx.message.text }] });

  await ctx.replyWithChatAction("typing");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": GEMINI_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: history,
        }),
      }
    );
    const data = await res.json();
    const answer = data.candidates[0].content.parts[0].text;

    history.push({ role: "model", parts: [{ text: answer }] });
    histories.set(id, history.slice(-MAX_MESSAGES));
    await ctx.reply(answer);
  } catch (err) {
    console.error(err);
    history.pop();
    await ctx.reply("Что-то пошло не так, попробуй ещё раз.");
  }
});

bot.start();
console.log("Бот запущен");
