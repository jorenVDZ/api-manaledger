import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function signUp() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🚀 Supabase User Sign Up\n');

  const email = await question('Email: ');
  const password = await question('Password (min 6 characters): ');
  const confirmPassword = await question('Confirm Password: ');

  if (password.trim() !== confirmPassword.trim()) {
    console.error('\n❌ Passwords do not match');
    rl.close();
    process.exit(1);
  }

  if (password.trim().length < 6) {
    console.error('\n❌ Password must be at least 6 characters long');
    rl.close();
    process.exit(1);
  }

  console.log('\n🔄 Creating account...\n');

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim()
  });

  rl.close();

  if (error) {
    console.error('❌ Sign up failed:', error.message);
    process.exit(1);
  }

  if (!data.user) {
    console.error('❌ No user returned');
    process.exit(1);
  }

  console.log('✅ Account created successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 User Information:');
  console.log(`   ID: ${data.user.id}`);
  console.log(`   Email: ${data.user.email}`);
  console.log(`   Created: ${new Date(data.user.created_at).toLocaleString()}`);
  
  if (data.user.confirmation_sent_at) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email Confirmation Required:');
    console.log('   A confirmation email has been sent to your email address.');
    console.log('   Please check your inbox and click the confirmation link.');
    console.log('\n   Note: You may need to confirm your email before signing in,');
    console.log('   depending on your Supabase project settings.');
  }

  if (data.session) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔑 Access Token:\n');
    console.log(data.session.access_token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⏰ Token Expiration:');
    console.log(`   Expires at: ${new Date(data.session.expires_at! * 1000).toLocaleString()}`);
    console.log(`   Expires in: ${Math.floor((data.session.expires_at! * 1000 - Date.now()) / 1000 / 60)} minutes`);
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ℹ️  No session created:');
    console.log('   Email confirmation is required before you can sign in.');
    console.log('   After confirming your email, use:');
    console.log('   npm run get-token');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Next Steps:\n');
  
  if (!data.session) {
    console.log('   1. Check your email and confirm your account');
    console.log('   2. Run: npm run get-token');
    console.log('   3. Use the token to access protected API endpoints');
  } else {
    console.log('   Use the token above to access protected API endpoints:');
    console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/me');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

signUp().catch(console.error);
