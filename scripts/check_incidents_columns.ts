import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: incs, error: incErr } = await supabase.from('incidents').select('*');
  console.log('Incidents count:', incs?.length, 'Error:', incErr);
  if (incs && incs.length > 0) {
    console.log('Incident sample keys:', Object.keys(incs[0]));
    console.log('First 5 incidents:', incs.slice(0, 5).map(i => ({
      id: i.id,
      case_id: i.case_id,
      title: i.title,
      created_at: i.created_at,
    })));
  }

  const { data: otps, error: otpErr } = await supabase.from('user_otp_verifications').select('*');
  console.log('OTPs count:', otps?.length, 'Error:', otpErr);
  if (otps && otps.length > 0) {
    console.log('First 5 OTPs:', otps.slice(0, 5).map(o => ({
      id: o.id,
      email: o.email,
      mobile: o.mobile_number,
      verified: o.verified,
      created_at: o.created_at,
    })));
  }
}

main().catch(console.error);

