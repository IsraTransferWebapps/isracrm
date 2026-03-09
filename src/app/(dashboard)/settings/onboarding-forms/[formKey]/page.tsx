import { getFormConfig } from '@/lib/form-config/fetch';
import { FormEditor } from './form-editor';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  params: Promise<{ formKey: string }>;
}

export default async function FormEditorPage({ params }: Props) {
  const { formKey } = await params;
  const config = await getFormConfig(formKey);

  if (!config) {
    notFound();
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link
          href="/settings/onboarding-forms"
          className="inline-flex items-center text-xs text-[#717D93] hover:text-[#253859] mb-3"
        >
          <ChevronLeft className="w-3 h-3 mr-1" />
          Back to Forms
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#253859]">{config.display_name}</h1>
            <p className="text-sm text-[#717D93] mt-0.5">
              {config.description || `Edit fields, sections, and validation for the ${config.display_name} form.`}
            </p>
          </div>
          <span className="text-xs text-[#94A3B8] bg-[#F4F5F7] px-2.5 py-1 rounded-full">
            v{config.version}
          </span>
        </div>
      </div>

      <FormEditor config={config} />
    </div>
  );
}
