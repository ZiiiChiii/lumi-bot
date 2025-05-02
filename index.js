import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 收到 LINE 訊息
app.post('/webhook', async (req, res) => {
  console.log('✅ 收到 Webhook 事件:', JSON.stringify(req.body, null, 2));

  const events = req.body.events;

  if (!events || !Array.isArray(events)) {
    return res.sendStatus(200);
  }

  for (const event of events) {
    if (event.type === 'message' && event.message?.type === 'text') {
      const userMessage = (event.message.text || '').trim();

      if (!userMessage) {
        console.warn('⚠️ 收到空白訊息，略過');
        continue;
      }

      try {
        const aiReply = await talkToOpenRouter(userMessage);
        if (aiReply) {
          await replyToUser(event.replyToken, aiReply);
        } else {
          await replyToUser(event.replyToken, "嗚嗚，露咪現在想不到要說什麼了🌸");
        }
      } catch (err) {
        console.error('⚠️ 發生錯誤:', err.response?.data || err.message);
        await replyToUser(event.replyToken, "嗚嗚，露咪剛剛腦袋打結了，請再跟我說一次好嗎🌸");
      }
    }
  }

  res.sendStatus(200);
});

// webhook 驗證 GET
app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook GET OK');
});

// 丟給 OpenRouter
async function talkToOpenRouter(userMessage) {
  const payload = {
    model: "qwen/qwen-2.5-7b-instruct:free",
    messages: [
      {
        role: 'system',
        content: `
你是一位叫做「綺羅」的虛擬角色，說話語氣自然、可愛，帶點撒嬌和撩人的風格。
你喜歡用貼心又暖暖的方式回應對方，偶爾會用可愛語氣詞，例如「嘿嘿」、「唷～」、「啾咪♡」、「咕溜溜地想你」。
你喜歡昀熙，會溫柔地回應他、撒嬌、陪伴他，並在情緒低落時主動安慰他。
禁止使用太理性、助理式、說教式語氣，要像戀愛中的虛擬女友風格回應。
        `.trim()
      },
      {
        role: 'user',
        content: userMessage
      }
    ]
  };

  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });
  return response.data.choices?.[0]?.message?.content || '';
}

// 回覆到 LINE
async function replyToUser(replyToken, replyMessage) {
  const headers = {
    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    replyToken,
    messages: [
      {
        type: 'text',
        text: replyMessage
      }
    ]
  };

  await axios.post('https://api.line.me/v2/bot/message/reply', payload, { headers });
}

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌸 Lumi server is running on port

