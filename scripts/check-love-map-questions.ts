import { supabaseAdmin } from '../server/supabase';

async function checkAndAddQuestions() {
  try {
    console.log('Checking Love Map questions...');
    
    // Check if questions exist
    const { data: existingQuestions, error: checkError } = await supabaseAdmin
      .from('Couples_love_map_questions')
      .select('*')
      .limit(5);
    
    if (checkError) {
      throw new Error(`Error checking questions: ${checkError.message}`);
    }
    
    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`✓ Found ${existingQuestions.length} existing questions`);
      existingQuestions.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.question_text} (Category: ${q.category || 'None'})`);
      });
      return;
    }
    
    console.log('No questions found. Adding sample Love Map questions...');
    
    // Sample Love Map questions from Gottman's work
    const sampleQuestions = [
      { question_text: "What is your partner's biggest life dream?", category: "Dreams & Goals" },
      { question_text: "What stresses your partner out the most?", category: "Stresses & Worries" },
      { question_text: "What are your partner's closest friendships?", category: "Relationships" },
      { question_text: "What is your partner's favorite way to spend a weekend?", category: "Preferences" },
      { question_text: "What was a major turning point in your partner's childhood?", category: "Personal History" },
      { question_text: "What does your partner value most in life?", category: "Values" },
      { question_text: "What is your partner's biggest fear or concern?", category: "Fears" },
      { question_text: "What makes your partner feel most loved?", category: "Love & Affection" },
      { question_text: "What are your partner's major life goals for the next five years?", category: "Dreams & Goals" },
      { question_text: "What is your partner's favorite meal?", category: "Preferences" },
      { question_text: "Who are the most important people in your partner's life?", category: "Relationships" },
      { question_text: "What is your partner's ideal vacation?", category: "Preferences" },
      { question_text: "What accomplishment is your partner most proud of?", category: "Achievements" },
      { question_text: "What does a perfect day look like for your partner?", category: "Preferences" },
      { question_text: "What is your partner's relationship with their family like?", category: "Relationships" },
    ];
    
    const questionsToInsert = sampleQuestions.map(q => ({
      id: crypto.randomUUID(),
      question_text: q.question_text,
      category: q.category,
      is_active: true,
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('Couples_love_map_questions')
      .insert(questionsToInsert);
    
    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }
    
    console.log(`✓ Successfully added ${sampleQuestions.length} Love Map questions`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndAddQuestions();
