export interface EnneagramQuestion {
  id: number;
  question_text: string;
  enneagram_type: number;
}

export const enneagramQuestions: EnneagramQuestion[] = [
  { id: 1, question_text: "I am motivated to be perfect and avoid making mistakes.", enneagram_type: 1 },
  { id: 2, question_text: "I am motivated to help others and be needed.", enneagram_type: 2 },
  { id: 3, question_text: "I am motivated to succeed and be admired.", enneagram_type: 3 },
  { id: 4, question_text: "I am motivated to be unique and express myself.", enneagram_type: 4 },
  { id: 5, question_text: "I am motivated to be knowledgeable and competent.", enneagram_type: 5 },
  { id: 6, question_text: "I am motivated to be secure and prepared.", enneagram_type: 6 },
  { id: 7, question_text: "I am motivated to be happy and avoid pain.", enneagram_type: 7 },
  { id: 8, question_text: "I am motivated to be strong and in control.", enneagram_type: 8 },
  { id: 9, question_text: "I am motivated to maintain peace and avoid conflict.", enneagram_type: 9 },
  { id: 10, question_text: "I have high standards for myself and others.", enneagram_type: 1 },
  { id: 11, question_text: "I often put others' needs before my own.", enneagram_type: 2 },
  { id: 12, question_text: "I am very goal-oriented and driven to accomplish tasks.", enneagram_type: 3 },
  { id: 13, question_text: "I often feel misunderstood by others.", enneagram_type: 4 },
  { id: 14, question_text: "I prefer to observe rather than participate.", enneagram_type: 5 },
  { id: 15, question_text: "I tend to be cautious and think about worst-case scenarios.", enneagram_type: 6 },
  { id: 16, question_text: "I love variety and trying new experiences.", enneagram_type: 7 },
  { id: 17, question_text: "I am direct and assertive in my communication.", enneagram_type: 8 },
  { id: 18, question_text: "I go with the flow and adapt easily to others.", enneagram_type: 9 },
  { id: 19, question_text: "I notice and correct errors easily.", enneagram_type: 1 },
  { id: 20, question_text: "I am warm and generous with my time and resources.", enneagram_type: 2 },
  { id: 21, question_text: "I am image-conscious and aware of how I'm perceived.", enneagram_type: 3 },
  { id: 22, question_text: "I am drawn to beauty and aesthetics.", enneagram_type: 4 },
  { id: 23, question_text: "I need time alone to recharge and think.", enneagram_type: 5 },
  { id: 24, question_text: "I value loyalty and commitment highly.", enneagram_type: 6 },
  { id: 25, question_text: "I have difficulty sitting still and need to stay busy.", enneagram_type: 7 },
  { id: 26, question_text: "I am comfortable taking charge of situations.", enneagram_type: 8 },
  { id: 27, question_text: "I tend to see all sides of an issue.", enneagram_type: 9 },
  { id: 28, question_text: "I believe there is a right way to do things.", enneagram_type: 1 },
  { id: 29, question_text: "I feel fulfilled when I make others happy.", enneagram_type: 2 },
  { id: 30, question_text: "I am energized by challenges and competition.", enneagram_type: 3 },
  { id: 31, question_text: "I am in touch with my emotions and express them openly.", enneagram_type: 4 },
  { id: 32, question_text: "I prefer to analyze situations logically.", enneagram_type: 5 },
  { id: 33, question_text: "I question authority and think critically.", enneagram_type: 6 },
  { id: 34, question_text: "I reframe negatives into positives.", enneagram_type: 7 },
  { id: 35, question_text: "I stand up for the underdog.", enneagram_type: 8 },
  { id: 36, question_text: "I dislike confrontation and prefer harmony.", enneagram_type: 9 },
];

export function calculateEnneagramType(responses: { [questionId: number]: number }) {
  const scores: { [type: number]: number } = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0
  };

  enneagramQuestions.forEach(question => {
    const response = responses[question.id];
    if (response) {
      scores[question.enneagram_type] += response;
    }
  });

  const dominantType = Object.entries(scores).reduce((a, b) => scores[parseInt(a[0])] > scores[parseInt(b[0])] ? a : b)[0];

  return {
    dominantType: parseInt(dominantType),
    scores,
  };
}

export const enneagramTypeInfo = {
  1: {
    title: "The Reformer",
    description: "Principled, purposeful, self-controlled, and perfectionistic. You strive to be right, improve everything, and fear being corrupt or defective.",
    strengths: ["Ethical and honest", "Organized and reliable", "High standards", "Self-disciplined"],
    challenges: ["Can be overly critical", "Perfectionism causes stress", "Difficulty relaxing", "May judge others harshly"],
  },
  2: {
    title: "The Helper",
    description: "Generous, demonstrative, people-pleasing, and possessive. You want to be loved, appreciated, and needed by others.",
    strengths: ["Caring and empathetic", "Generous and warm", "Supportive of others", "Intuitive about needs"],
    challenges: ["May neglect own needs", "Can be possessive", "Difficulty saying no", "Seeks validation externally"],
  },
  3: {
    title: "The Achiever",
    description: "Success-oriented, adaptable, excelling, driven, and image-conscious. You want to be valuable, admired, and successful.",
    strengths: ["Goal-oriented and productive", "Confident and inspiring", "Adaptable", "Efficient and organized"],
    challenges: ["May prioritize image over authenticity", "Workaholic tendencies", "Can be overly competitive", "Difficulty with feelings"],
  },
  4: {
    title: "The Individualist",
    description: "Expressive, dramatic, self-absorbed, and temperamental. You want to be yourself, express your individuality, and create beauty.",
    strengths: ["Creative and artistic", "Emotionally honest", "Empathetic to suffering", "Authentic and unique"],
    challenges: ["Can be moody", "May withdraw when hurt", "Envy of others", "Self-absorption"],
  },
  5: {
    title: "The Investigator",
    description: "Perceptive, innovative, secretive, and isolated. You want to be capable, competent, and knowledgeable.",
    strengths: ["Analytical and insightful", "Independent thinker", "Objective and calm", "Innovative problem-solver"],
    challenges: ["May be emotionally detached", "Can isolate", "Difficulty with action", "Hoarding resources/knowledge"],
  },
  6: {
    title: "The Loyalist",
    description: "Engaging, responsible, anxious, and suspicious. You want security, support, and guidance from others.",
    strengths: ["Loyal and committed", "Responsible and prepared", "Cooperative", "Witty and engaging"],
    challenges: ["Anxious and worrying", "Can be defensive", "Difficulty trusting", "Indecisive at times"],
  },
  7: {
    title: "The Enthusiast",
    description: "Spontaneous, versatile, distractible, and scattered. You want to be happy, satisfied, and avoid pain.",
    strengths: ["Optimistic and energetic", "Adventurous and fun-loving", "Quick-thinking", "Inspiring to others"],
    challenges: ["May avoid difficult emotions", "Can be impulsive", "Difficulty committing", "Scattered focus"],
  },
  8: {
    title: "The Challenger",
    description: "Self-confident, decisive, willful, and confrontational. You want to be strong, self-reliant, and protect yourself and others.",
    strengths: ["Confident and assertive", "Protective of loved ones", "Direct communicator", "Natural leader"],
    challenges: ["Can be domineering", "Difficulty showing vulnerability", "May intimidate others", "Control issues"],
  },
  9: {
    title: "The Peacemaker",
    description: "Receptive, reassuring, agreeable, and complacent. You want peace, harmony, and to avoid conflict.",
    strengths: ["Peaceful and harmonious", "Accepting of others", "Patient and stable", "Good mediator"],
    challenges: ["May avoid conflict too much", "Can be passive-aggressive", "Difficulty with priorities", "Tends to merge with others"],
  },
};
