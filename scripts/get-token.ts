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

async function getToken() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Supabase Authentication Token Generator\n');

  const email = await question('Email: ');
  const password = await question('Password: ');

  console.log('\n🔄 Signing in...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  rl.close();

  if (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }

  if (!data.session) {
    console.error('❌ No session returned');
    process.exit(1);
  }

  console.log('✅ Authentication successful!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 User Information:');
  console.log(`   ID: ${data.user.id}`);
  console.log(`   Email: ${data.user.email}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔑 Access Token:\n');
  console.log(data.session.access_token);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⏰ Token Expiration:');
  console.log(`   Expires at: ${new Date(data.session.expires_at! * 1000).toLocaleString()}`);
  console.log(`   Expires in: ${Math.floor((data.session.expires_at! * 1000 - Date.now()) / 1000 / 60)} minutes`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Usage Examples:\n');
  console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/me\n');
  console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/card/CARD_ID');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

getToken().catch(console.error);
