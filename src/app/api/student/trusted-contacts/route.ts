import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contacts, error } = await supabase
      .from('trusted_contacts')
      .select('id, user_id, student_id, name, phone, relationship, created_at')
      .or(`student_id.eq.${user.id},user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contacts: contacts || [] }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, relationship } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Contact name is required' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Contact phone number is required' }, { status: 400 });
    }

    // Phone sanity check (allows +, digits, spaces, hyphens; min 7 chars)
    const sanitizedPhone = phone.trim();
    if (!/^[+]?[\d\s-]{7,20}$/.test(sanitizedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const { data: contact, error } = await supabase
      .from('trusted_contacts')
      .insert({
        id: randomUUID(),
        user_id: user.id,
        student_id: user.id,
        name: name.trim(),
        phone: sanitizedPhone,
        relationship: relationship && typeof relationship === 'string' ? relationship.trim() : 'Emergency Contact'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const delQuery = supabase
      .from('trusted_contacts')
      .delete()
      .eq('id', contactId);

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { error } = typeof (delQuery as any).or === 'function'
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      ? await (delQuery as any).or(`student_id.eq.${user.id},user_id.eq.${user.id}`)
      : await delQuery.eq('student_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
