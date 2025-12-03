import express, { Request, Response } from 'express';
import cors from 'cors'; // CORS 라이브러리 추가
import { OpenAI } from 'openai';
import { llmResponseSchema } from '../src/services/llmSchema';
import { tiles } from '../src/data/tiles'; // tiles 내보내기 확인 필요

const app = express();
app.use(express.json());
app.use(cors()); // 모든 도메인에서의 요청 허용

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/infer', async (req: Request, res: Response) => {
  try {
    const { playerText, remainingTiles } = req.body;

    // OpenAI에 보낼 메시지 구성
    const system = `You are an assistant that outputs strict JSON for appearance inference...`;
    const user = JSON.stringify({ playerText, remainingTiles });

    const completion = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const raw = completion.output_text;
    const parsed = llmResponseSchema.parse(JSON.parse(raw));

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'LLM inference failed' });
  }
});

app.listen(8787, () => {
  console.log('LLM proxy listening on http://localhost:8787/infer');
});