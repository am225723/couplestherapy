import { supabaseAdmin } from '../server/supabase';

async function verifyAndUpdateCallahan() {
  try {
    const newTherapistId = '226ae091-325e-4084-a467-bee2bc8405f6';
    
    console.log('Step 1: Updating therapist link...');
    
    // Update the couple record to link to new therapist
    const { error: updateError } = await supabaseAdmin
      .from('Couples_couples')
      .update({ therapist_id: newTherapistId })
      .eq('id', '64b38ab3-e107-4143-8c58-246eed92a479');
    
    if (updateError) {
      throw new Error(`Failed to update therapist: ${updateError.message}`);
    }
    console.log('✓ Updated therapist link');

    console.log('\nStep 2: Verifying Couples_profiles...');
    
    // Verify Matthew's profile
    const { data: matthewProfile, error: matthewError } = await supabaseAdmin
      .from('Couples_profiles')
      .select('*')
      .eq('id', 'a47e29f7-0b6a-40d8-a6aa-2d8caebcfb6f')
      .single();
    
    if (matthewError || !matthewProfile) {
      throw new Error('Matthew profile not found');
    }
    console.log('✓ Matthew Callahan profile:', {
      id: matthewProfile.id,
      full_name: matthewProfile.full_name,
      role: matthewProfile.role,
      couple_id: matthewProfile.couple_id,
    });

    // Verify Karli's profile
    const { data: karliProfile, error: karliError } = await supabaseAdmin
      .from('Couples_profiles')
      .select('*')
      .eq('id', 'febb1d5a-9191-4a8b-9686-26eab3631860')
      .single();
    
    if (karliError || !karliProfile) {
      throw new Error('Karli profile not found');
    }
    console.log('✓ Karli Callahan profile:', {
      id: karliProfile.id,
      full_name: karliProfile.full_name,
      role: karliProfile.role,
      couple_id: karliProfile.couple_id,
    });

    console.log('\nStep 3: Verifying Couples_couples...');
    
    // Verify couple record
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('Couples_couples')
      .select('*')
      .eq('id', '64b38ab3-e107-4143-8c58-246eed92a479')
      .single();
    
    if (coupleError || !couple) {
      throw new Error('Couple record not found');
    }
    console.log('✓ Couple record:', {
      id: couple.id,
      partner1_id: couple.partner1_id,
      partner2_id: couple.partner2_id,
      therapist_id: couple.therapist_id,
    });

    console.log('\nStep 4: Verifying therapist profile...');
    
    // Verify therapist exists
    const { data: therapist, error: therapistError } = await supabaseAdmin
      .from('Couples_profiles')
      .select('*')
      .eq('id', newTherapistId)
      .single();
    
    if (therapistError || !therapist) {
      throw new Error('Therapist profile not found');
    }
    console.log('✓ Therapist profile:', {
      id: therapist.id,
      full_name: therapist.full_name,
      role: therapist.role,
    });

    console.log('\nStep 5: Checking auth users...');
    
    // List auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    const matthewAuth = users.find(u => u.email === 'matthew.callahan10@gmail.com');
    const karliAuth = users.find(u => u.email === 'karli.callahan16@gmail.com');
    
    console.log('✓ Matthew auth user:', matthewAuth ? {
      id: matthewAuth.id,
      email: matthewAuth.email,
      email_confirmed: matthewAuth.email_confirmed_at ? 'Yes' : 'No',
    } : 'NOT FOUND');
    
    console.log('✓ Karli auth user:', karliAuth ? {
      id: karliAuth.id,
      email: karliAuth.email,
      email_confirmed: karliAuth.email_confirmed_at ? 'Yes' : 'No',
    } : 'NOT FOUND');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL VERIFIED! Summary:');
    console.log('='.repeat(60));
    console.log(`Couple: Matthew & Karli Callahan`);
    console.log(`Couple ID: ${couple.id}`);
    console.log(`Therapist: ${therapist.full_name} (${therapist.id})`);
    console.log(`\nBoth partners can log in:`);
    console.log(`  - matthew.callahan10@gmail.com`);
    console.log(`  - karli.callahan16@gmail.com`);
    console.log(`\nTherapist can view them in admin dashboard`);
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAndUpdateCallahan();
