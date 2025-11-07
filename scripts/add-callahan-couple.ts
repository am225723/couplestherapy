import { supabaseAdmin } from '../server/supabase';

async function addCallahanCouple() {
  try {
    console.log('Starting to add Callahan couple...');

    // Step 1: Get therapist ID
    const { data: therapist, error: therapistError } = await supabaseAdmin
      .from('Couples_profiles')
      .select('id')
      .eq('role', 'therapist')
      .limit(1)
      .single();

    if (therapistError || !therapist) {
      throw new Error('Therapist not found');
    }

    const therapistId = therapist.id;
    console.log('Found therapist ID:', therapistId);

    // Step 2: Create Matthew's account
    const { data: matthewAuth, error: matthewError } = await supabaseAdmin.auth.admin.createUser({
      email: 'matthew.callahan10@gmail.com',
      password: 'mcally88',
      email_confirm: true,
    });

    if (matthewError) {
      throw new Error(`Failed to create Matthew: ${matthewError.message}`);
    }
    console.log('Created Matthew auth user:', matthewAuth.user.id);

    // Step 3: Create Karli's account
    const { data: karliAuth, error: karliError } = await supabaseAdmin.auth.admin.createUser({
      email: 'karli.callahan16@gmail.com',
      password: 'kcally16',
      email_confirm: true,
    });

    if (karliError) {
      // Rollback Matthew
      await supabaseAdmin.auth.admin.deleteUser(matthewAuth.user.id);
      throw new Error(`Failed to create Karli: ${karliError.message}`);
    }
    console.log('Created Karli auth user:', karliAuth.user.id);

    // Step 4: Create Matthew's profile (without couple_id yet)
    const { error: matthewProfileError } = await supabaseAdmin
      .from('Couples_profiles')
      .insert({
        id: matthewAuth.user.id,
        full_name: 'Matthew Callahan',
        role: 'client',
        couple_id: null,
      });

    if (matthewProfileError) {
      // Rollback both users
      await supabaseAdmin.auth.admin.deleteUser(matthewAuth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(karliAuth.user.id);
      throw new Error(`Failed to create Matthew's profile: ${matthewProfileError.message}`);
    }
    console.log('Created Matthew profile');

    // Step 5: Create Karli's profile (without couple_id yet)
    const { error: karliProfileError } = await supabaseAdmin
      .from('Couples_profiles')
      .insert({
        id: karliAuth.user.id,
        full_name: 'Karli Callahan',
        role: 'client',
        couple_id: null,
      });

    if (karliProfileError) {
      // Rollback everything
      await supabaseAdmin.from('Couples_profiles').delete().eq('id', matthewAuth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(matthewAuth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(karliAuth.user.id);
      throw new Error(`Failed to create Karli's profile: ${karliProfileError.message}`);
    }
    console.log('Created Karli profile');

    // Step 6: Create couple record (now that profiles exist)
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from('Couples_couples')
      .insert({
        partner1_id: matthewAuth.user.id,
        partner2_id: karliAuth.user.id,
        therapist_id: therapistId,
      })
      .select()
      .single();

    if (coupleError) {
      // Rollback everything
      await supabaseAdmin.from('Couples_profiles').delete().eq('id', matthewAuth.user.id);
      await supabaseAdmin.from('Couples_profiles').delete().eq('id', karliAuth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(matthewAuth.user.id);
      await supabaseAdmin.auth.admin.deleteUser(karliAuth.user.id);
      throw new Error(`Failed to create couple: ${coupleError.message}`);
    }
    console.log('Created couple record:', couple.id);

    // Step 7: Update both profiles with couple_id
    await supabaseAdmin
      .from('Couples_profiles')
      .update({ couple_id: couple.id })
      .eq('id', matthewAuth.user.id);

    await supabaseAdmin
      .from('Couples_profiles')
      .update({ couple_id: couple.id })
      .eq('id', karliAuth.user.id);

    console.log('Updated profiles with couple_id');

    console.log('\n✅ SUCCESS! Callahan couple created and linked to therapist');
    console.log('Couple ID:', couple.id);
    console.log('Matthew ID:', matthewAuth.user.id);
    console.log('Karli ID:', karliAuth.user.id);
    console.log('\nThey can now log in with:');
    console.log('  Matthew: matthew.callahan10@gmail.com / mcally88');
    console.log('  Karli: karli.callahan16@gmail.com / kcally16');
  } catch (error: any) {
    console.error('❌ Error adding couple:', error.message);
    process.exit(1);
  }
}

addCallahanCouple();
