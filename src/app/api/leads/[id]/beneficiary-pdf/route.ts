import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBeneficiaryPdf } from '@/lib/pdf/generate-beneficiary-pdf';
import type { BeneficiaryDeclaration } from '@/types/database';

/**
 * GET /api/leads/[id]/beneficiary-pdf
 *
 * Generates and returns a filled-in Beneficiary Declaration PDF
 * for the given client. Restricted to compliance_officer and management roles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  // 1. Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Role check (same pattern as /api/leads/[id]/review)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'compliance_officer' && profile.role !== 'management')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // 3. Fetch client individual details
  const { data: individual } = await supabase
    .from('individual_details')
    .select('first_name, last_name, israeli_id_number, passport_number, custom_data')
    .eq('client_id', clientId)
    .single();

  if (!individual) {
    return NextResponse.json({ error: 'Client details not found' }, { status: 404 });
  }

  // 4. Fetch beneficiary declarations (up to 2, ordered by creation)
  const { data: beneficiaries } = await supabase
    .from('beneficiary_declarations')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(2);

  const beneficiaryList = (beneficiaries ?? []) as BeneficiaryDeclaration[];

  if (beneficiaryList.length === 0) {
    return NextResponse.json({ error: 'No beneficiary declarations found' }, { status: 404 });
  }

  // 5. Fetch signature image from Supabase Storage
  let signaturePngBytes: Uint8Array | null = null;
  const signaturePath = beneficiaryList[0]?.signature_image;

  if (signaturePath) {
    const { data: signatureData, error: sigError } = await supabase.storage
      .from('onboarding-documents')
      .download(signaturePath);

    if (!sigError && signatureData) {
      signaturePngBytes = new Uint8Array(await signatureData.arrayBuffer());
    }
  }

  // 6. Determine checkbox logic
  // The form has an "acting_for_beneficiary" switch stored in individual_details.custom_data
  const customData = (individual.custom_data as Record<string, unknown>) ?? {};
  const actingForBeneficiary = customData.acting_for_beneficiary === true;
  const forMyself = !actingForBeneficiary;

  // 7. Fetch the PDF template from the app's own static files
  const templateUrl = new URL('/templates/beneficiary-declaration.pdf', request.url);
  const templateResponse = await fetch(templateUrl);

  if (!templateResponse.ok) {
    console.error('Failed to fetch PDF template:', templateResponse.status);
    return NextResponse.json({ error: 'PDF template not found' }, { status: 500 });
  }

  const templateBytes = new Uint8Array(await templateResponse.arrayBuffer());

  // 8. Generate the filled PDF
  const declarationDate = beneficiaryList[0]?.declaration_date ?? null;

  const pdfBytes = await generateBeneficiaryPdf({
    templateBytes,
    declarantFullName: `${individual.first_name} ${individual.last_name}`,
    israeliIdNumber: individual.israeli_id_number,
    passportNumber: individual.passport_number,
    beneficiaries: beneficiaryList,
    forMyself,
    signaturePngBytes,
    declarationDate,
  });

  // 9. Return as downloadable PDF
  const clientName = `${individual.first_name}_${individual.last_name}`.replace(/\s+/g, '_');
  const filename = `Beneficiary_Declaration_${clientName}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
