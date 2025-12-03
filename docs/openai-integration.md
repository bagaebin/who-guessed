# OpenAI API 연동 절차

이 문서는 클라이언트(프런트엔드)에서 `VITE_LLM_ENDPOINT`로 호출하는 OpenAI 프록시/백엔드 엔드포인트를 준비하는 방법을 안내합니다. 게임 클라이언트는 **직접 OpenAI 키를 노출하지 않으며**, 다음의 API를 호출한다고 가정합니다:

```
POST {VITE_LLM_ENDPOINT}
Content-Type: application/json
{
  "playerText": string,
  "remainingTiles": CharacterTile[]
}
```

## 1. 요구사항
- Node.js 18+ (fetch 내장)
- OPENAI_API_KEY (또는 호환 모델 키)
- 패키지: `openai`, `express`, `zod` (예시 서버 기준)

## 2. 샘플 프록시 서버 (Express)
`server/openai-proxy.ts`와 같이 별도 서버를 생성하고, 클라이언트에서는 `VITE_LLM_ENDPOINT`를 이 서버 URL로 지정합니다.

```ts
import express from 'express';
import { OpenAI } from 'openai';
import { llmResponseSchema } from '../src/services/llmSchema';
import { tiles } from '../src/data/tiles';

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/infer', async (req, res) => {
  try {
    const { playerText, remainingTiles } = req.body;

    // 안전장치: 클라이언트 조작 방지용으로 서버 측에서 남은 타일을 확정하고 비교해도 됩니다.
    // const validatedTiles = tiles.filter((t) => !t.isEliminated);

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
```

> **주의:** `openai.responses`는 최신 OpenAI SDK 메서드입니다. 다른 SDK 버전이라면 `client.chat.completions.create` 등 사용 중인 버전에 맞춰 입력을 조정하세요.

## 3. 클라이언트 환경 변수 설정
프로젝트 루트에 `.env.local`을 만들어 프록시 URL을 지정합니다.

```
VITE_LLM_ENDPOINT=http://localhost:8787/infer
```

## 4. 요청/응답 포맷
- 요청: `{ playerText: string, remainingTiles: CharacterTile[] }`
- 응답: `llmResponseSchema`를 만족하는 JSON (`profile`, `eliminatedIds`, 선택적으로 `reasoning`)
- 필수 카테고리(Unknown 금지)는 `src/services/llmSchema.ts`에서 검증됩니다.

## 5. 에러 및 폴백
- 프록시 오류나 검증 실패 시 클라이언트는 `mockInferPlayerAppearance` 목업으로 폴백합니다.
- 서버 측에서는 `llmResponseSchema.parse`를 통해 LLM이 반환한 JSON을 검증해 두면 안전합니다.

## 6. 운영 배포 팁
- 서버는 별도 도메인/경로로 배포하고, CORS를 허용합니다.
- OpenAI 키는 서버 환경 변수로만 보관합니다(클라이언트 노출 금지).
- 요청량 제어를 위해 간단한 레이트 리밋 미들웨어를 고려하십시오.
```
