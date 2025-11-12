export interface AttachmentQuestion {
  id: number;
  question_text: string;
  attachment_category: 'secure' | 'anxious' | 'avoidant' | 'disorganized';
  reverse_scored: boolean;
}

export const attachmentQuestions: AttachmentQuestion[] = [
  {
    id: 1,
    question_text: "I find it relatively easy to get close to others emotionally.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 2,
    question_text: "I worry that romantic partners won't care about me as much as I care about them.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 3,
    question_text: "I am comfortable without close emotional relationships.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 4,
    question_text: "I find that others are reluctant to get as close as I would like.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 5,
    question_text: "I am comfortable depending on romantic partners.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 6,
    question_text: "I prefer not to depend on others or have others depend on me.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 7,
    question_text: "I don't worry about being alone or others not accepting me.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 8,
    question_text: "I worry about being abandoned in relationships.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 9,
    question_text: "I am very comfortable being close to others.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 10,
    question_text: "I prefer not to show others how I feel deep down.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 11,
    question_text: "I often wish that my partner's feelings for me were as strong as my feelings for them.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 12,
    question_text: "I get uncomfortable when people want to be very close emotionally.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 13,
    question_text: "I rarely worry about my partner leaving me.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 14,
    question_text: "I sometimes feel confused about my feelings in relationships.",
    attachment_category: "disorganized",
    reverse_scored: false
  },
  {
    id: 15,
    question_text: "I find it easy to trust others completely.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 16,
    question_text: "I want to be completely emotionally intimate but find others are reluctant.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 17,
    question_text: "I am nervous when anyone gets too close to me emotionally.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 18,
    question_text: "I sometimes feel like I want closeness and also want to pull away at the same time.",
    attachment_category: "disorganized",
    reverse_scored: false
  },
  {
    id: 19,
    question_text: "I feel comfortable sharing my private thoughts and feelings with my partner.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 20,
    question_text: "My desire for closeness sometimes scares people away.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 21,
    question_text: "I try to avoid getting too close to my partner.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 22,
    question_text: "I find myself getting hurt easily in relationships.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 23,
    question_text: "It helps to turn to others in times of need.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 24,
    question_text: "I tell my partner just about everything.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 25,
    question_text: "I sometimes feel relationships are confusing and unpredictable.",
    attachment_category: "disorganized",
    reverse_scored: false
  },
  {
    id: 26,
    question_text: "I feel comfortable having others depend on me.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 27,
    question_text: "I worry a lot about my relationships.",
    attachment_category: "anxious",
    reverse_scored: false
  },
  {
    id: 28,
    question_text: "I prefer to keep my independence in relationships.",
    attachment_category: "secure",
    reverse_scored: true
  },
  {
    id: 29,
    question_text: "I feel like I can count on my partner when I need support.",
    attachment_category: "secure",
    reverse_scored: false
  },
  {
    id: 30,
    question_text: "I sometimes feel trapped by closeness in relationships.",
    attachment_category: "disorganized",
    reverse_scored: false
  }
];

export function calculateAttachmentStyle(responses: { [questionId: number]: number }) {
  const scores = {
    secure: 0,
    anxious: 0,
    avoidant: 0,
    disorganized: 0
  };

  const categoryCounts = {
    secure: 0,
    anxious: 0,
    avoidant: 0,
    disorganized: 0
  };

  attachmentQuestions.forEach(question => {
    const response = responses[question.id];
    if (response !== undefined && response !== null) {
      const score = question.reverse_scored ? (6 - response) : response;
      scores[question.attachment_category] += score;
      categoryCounts[question.attachment_category]++;
    }
  });

  const normalizedScores = {
    secure: categoryCounts.secure > 0 ? Math.round((scores.secure / (categoryCounts.secure * 5)) * 100) : 0,
    anxious: categoryCounts.anxious > 0 ? Math.round((scores.anxious / (categoryCounts.anxious * 5)) * 100) : 0,
    avoidant: categoryCounts.avoidant > 0 ? Math.round((scores.avoidant / (categoryCounts.avoidant * 5)) * 100) : 0,
    disorganized: categoryCounts.disorganized > 0 ? Math.round((scores.disorganized / (categoryCounts.disorganized * 5)) * 100) : 0
  };

  const primaryStyle = Object.entries(normalizedScores).reduce((a, b) => 
    normalizedScores[a[0] as keyof typeof normalizedScores] > normalizedScores[b[0] as keyof typeof normalizedScores] ? a : b
  )[0] as 'secure' | 'anxious' | 'avoidant' | 'disorganized';

  return { primaryStyle, scores: normalizedScores };
}
