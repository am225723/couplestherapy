import { QuizQuestion, LoveLanguageType, LOVE_LANGUAGES } from "@shared/schema";

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    optionA: {
      text: "I like to receive notes of affirmation from you",
      language: "Words of Affirmation",
    },
    optionB: { text: "I like it when you hug me", language: "Physical Touch" },
  },
  {
    id: 2,
    optionA: {
      text: "I like to spend one-on-one time with you",
      language: "Quality Time",
    },
    optionB: {
      text: "I feel loved when you give me practical help",
      language: "Acts of Service",
    },
  },
  {
    id: 3,
    optionA: {
      text: "I like it when you give me gifts",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I like taking long walks with you",
      language: "Quality Time",
    },
  },
  {
    id: 4,
    optionA: {
      text: "I feel loved when you do things to help me",
      language: "Acts of Service",
    },
    optionB: {
      text: "I feel loved when you hug or touch me",
      language: "Physical Touch",
    },
  },
  {
    id: 5,
    optionA: {
      text: "I feel loved when you give me a gift",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I like hearing you tell me that you appreciate me",
      language: "Words of Affirmation",
    },
  },
  {
    id: 6,
    optionA: {
      text: "I like being with you and doing things together",
      language: "Quality Time",
    },
    optionB: {
      text: "I like it when you compliment me",
      language: "Words of Affirmation",
    },
  },
  {
    id: 7,
    optionA: {
      text: "I feel loved when you give me something thoughtful",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I appreciate when you help me with my responsibilities",
      language: "Acts of Service",
    },
  },
  {
    id: 8,
    optionA: {
      text: "I feel loved when you put your arm around me",
      language: "Physical Touch",
    },
    optionB: {
      text: "I feel special when you tell me how much I mean to you",
      language: "Words of Affirmation",
    },
  },
  {
    id: 9,
    optionA: {
      text: "I value your help with my tasks",
      language: "Acts of Service",
    },
    optionB: {
      text: "I value receiving special gifts from you",
      language: "Receiving Gifts",
    },
  },
  {
    id: 10,
    optionA: {
      text: "I love spending uninterrupted time with you",
      language: "Quality Time",
    },
    optionB: {
      text: "I love it when you hold my hand",
      language: "Physical Touch",
    },
  },
  {
    id: 11,
    optionA: {
      text: "Your words of encouragement mean a lot to me",
      language: "Words of Affirmation",
    },
    optionB: {
      text: "I appreciate when you do my chores for me",
      language: "Acts of Service",
    },
  },
  {
    id: 12,
    optionA: {
      text: "I cherish small gifts you give me",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I like when we spend quality time together",
      language: "Quality Time",
    },
  },
  {
    id: 13,
    optionA: {
      text: "I feel loved when you tell me you believe in me",
      language: "Words of Affirmation",
    },
    optionB: {
      text: "I feel loved when you hold me close",
      language: "Physical Touch",
    },
  },
  {
    id: 14,
    optionA: {
      text: "I love getting unexpected gifts from you",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I love it when we sit and talk for hours",
      language: "Quality Time",
    },
  },
  {
    id: 15,
    optionA: {
      text: "I feel appreciated when you help me without being asked",
      language: "Acts of Service",
    },
    optionB: {
      text: "I feel appreciated when you kiss me",
      language: "Physical Touch",
    },
  },
  {
    id: 16,
    optionA: {
      text: "I like receiving your thoughtful presents",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "I like hearing you say 'I love you'",
      language: "Words of Affirmation",
    },
  },
  {
    id: 17,
    optionA: {
      text: "I enjoy full attention during our conversations",
      language: "Quality Time",
    },
    optionB: {
      text: "I enjoy it when you take care of tasks for me",
      language: "Acts of Service",
    },
  },
  {
    id: 18,
    optionA: {
      text: "I feel special when you touch me affectionately",
      language: "Physical Touch",
    },
    optionB: {
      text: "I feel special when you surprise me with a gift",
      language: "Receiving Gifts",
    },
  },
  {
    id: 19,
    optionA: {
      text: "I like hearing compliments from you",
      language: "Words of Affirmation",
    },
    optionB: {
      text: "I like having your undivided attention",
      language: "Quality Time",
    },
  },
  {
    id: 20,
    optionA: {
      text: "I appreciate when you fix things around the house",
      language: "Acts of Service",
    },
    optionB: {
      text: "I appreciate when you massage my shoulders",
      language: "Physical Touch",
    },
  },
  {
    id: 21,
    optionA: {
      text: "Thoughtful gifts make me feel loved",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "Kind words make me feel loved",
      language: "Words of Affirmation",
    },
  },
  {
    id: 22,
    optionA: {
      text: "I feel connected when we spend time together",
      language: "Quality Time",
    },
    optionB: {
      text: "I feel connected when you help me with projects",
      language: "Acts of Service",
    },
  },
  {
    id: 23,
    optionA: {
      text: "I love when you cuddle with me",
      language: "Physical Touch",
    },
    optionB: {
      text: "I love when you plan special dates for us",
      language: "Quality Time",
    },
  },
  {
    id: 24,
    optionA: {
      text: "Receiving a gift on special occasions means everything",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "Hearing 'thank you' from you means everything",
      language: "Words of Affirmation",
    },
  },
  {
    id: 25,
    optionA: {
      text: "I value your help with daily responsibilities",
      language: "Acts of Service",
    },
    optionB: {
      text: "I value physical closeness with you",
      language: "Physical Touch",
    },
  },
  {
    id: 26,
    optionA: {
      text: "Your words of praise lift me up",
      language: "Words of Affirmation",
    },
    optionB: {
      text: "Receiving presents from you lifts me up",
      language: "Receiving Gifts",
    },
  },
  {
    id: 27,
    optionA: {
      text: "I love our deep conversations together",
      language: "Quality Time",
    },
    optionB: {
      text: "I love when you help me tackle my to-do list",
      language: "Acts of Service",
    },
  },
  {
    id: 28,
    optionA: {
      text: "Holding hands makes me feel connected to you",
      language: "Physical Touch",
    },
    optionB: {
      text: "Doing activities together makes me feel connected to you",
      language: "Quality Time",
    },
  },
  {
    id: 29,
    optionA: {
      text: "I feel appreciated when you notice my efforts",
      language: "Words of Affirmation",
    },
    optionB: {
      text: "I feel appreciated when you pitch in with housework",
      language: "Acts of Service",
    },
  },
  {
    id: 30,
    optionA: {
      text: "Small tokens of love mean so much to me",
      language: "Receiving Gifts",
    },
    optionB: {
      text: "Physical affection means so much to me",
      language: "Physical Touch",
    },
  },
];

export function calculateLoveLanguageScores(answers: LoveLanguageType[]): {
  scores: Record<string, number>;
  primary: LoveLanguageType;
  secondary: LoveLanguageType;
} {
  const scores: Record<string, number> = {
    "Words of Affirmation": 0,
    "Quality Time": 0,
    "Receiving Gifts": 0,
    "Acts of Service": 0,
    "Physical Touch": 0,
  };

  answers.forEach((answer) => {
    scores[answer]++;
  });

  const sortedLanguages = (
    Object.entries(scores) as [LoveLanguageType, number][]
  ).sort((a, b) => b[1] - a[1]);

  return {
    scores,
    primary: sortedLanguages[0][0],
    secondary: sortedLanguages[1][0],
  };
}
