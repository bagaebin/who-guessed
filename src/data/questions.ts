export type QuestionEntry = {
  id: string;
  text: string;
  topic: 'identity' | 'family' | 'community' | 'work' | 'style' | 'hobbies' | 'values';
};

export const questionPool: QuestionEntry[] = [
  {
    id: 'q1',
    text: '당신이 가장 편안함을 느끼는 사람들과의 관계는 어떤 모습인가요?',
    topic: 'identity'
  },
  {
    id: 'q2',
    text: '어릴 때 자주 듣던 별명이나 묘사는 무엇이었나요?',
    topic: 'identity'
  },
  {
    id: 'q3',
    text: '친구들이 당신에게 기대하는 역할이나 분위기가 있다면 무엇인가요?',
    topic: 'community'
  },
  {
    id: 'q4',
    text: '가족이나 가까운 사람들이 당신을 어떻게 표현하는지 한 문장으로 알려주세요.',
    topic: 'family'
  },
  {
    id: 'q5',
    text: '즐겨 입는 옷차림이나 스타일 분위기를 설명해 주세요.',
    topic: 'style'
  },
  {
    id: 'q6',
    text: '주말이나 여가 시간에는 주로 무엇을 하며 보내나요?',
    topic: 'hobbies'
  },
  {
    id: 'q7',
    text: '학교나 직장에서 가장 자주 듣는 피드백은 무엇이었나요?',
    topic: 'work'
  },
  {
    id: 'q8',
    text: '중요하게 생각하는 가치나 태도를 하나만 꼽는다면 무엇인가요?',
    topic: 'values'
  },
  {
    id: 'q9',
    text: '새로운 사람을 만날 때 가장 먼저 나누는 이야기는 무엇인가요?',
    topic: 'community'
  },
  {
    id: 'q10',
    text: '자신의 외모나 분위기를 표현하는 단어 세 가지를 적어 주세요.',
    topic: 'style'
  }
];
