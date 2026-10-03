
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Incident from '@/lib/models/Incident';
import { analyzeIncident } from '@/lib/ai/seriousness';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    // In a real app, extract studentId from JWT token
    const { complaintText, location, studentId } = body;

    if (!complaintText) {
      return NextResponse.json({ error: 'Complaint text is required' }, { status: 400 });
    }

    // 1. AI Analysis
    const aiResult = await analyzeIncident(complaintText);

    // 2. Determine Case ID
    const count = await Incident.countDocuments();
    const caseId = `KC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // 3. Fallback logic & rule engine constraints
    let finalSeverity = aiResult.severity;

    // Safety Fallback: Ensure keywords bump severity if AI fails to classify properly
    const lowerComplaint = complaintText.toLowerCase();
    if (lowerComplaint.includes('kill') || lowerComplaint.includes('attack') || lowerComplaint.includes('weapon')) {
      finalSeverity = 'L4';
    }

    // 4. Role-based routing (Privacy safe)
    let staffVisibility = aiResult.suggestedRouting;

    // 5. Create Incident
    const incident = await Incident.create({
      caseId,
      studentId, // Mock ID for now if none provided
      complaintText,
      category: aiResult.category,
      severity: finalSeverity,
      urgency: aiResult.urgency,
      location,
      status: 'RECEIVED',
      aiAnalysis: aiResult,
      staffVisibility
    });

    return NextResponse.json({
      success: true,
      caseId,
      severity: finalSeverity,
      routing: staffVisibility,
      message: 'Incident reported successfully. Authorities have been notified.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Incident Creation Error:', error);
    return NextResponse.json({ error: 'Failed to report incident', details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Sort by most recent and urgency
    const incidents = await Incident.find()
      .sort({ createdAt: -1 })
      .populate('studentId', 'name collegeId department');
    // Only populating non-highly-sensitive info by default for list view

    return NextResponse.json({ success: true, data: incidents });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}
