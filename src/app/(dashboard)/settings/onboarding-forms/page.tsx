import { getFormConfigSummaries } from '@/lib/form-config/admin-actions';
import { SectionCard } from '@/components/onboarding/section-card';
import Link from 'next/link';
import { FileText, ChevronRight, Settings2 } from 'lucide-react';

export default async function OnboardingFormsPage() {
  const configs = await getFormConfigSummaries();

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#253859]">Onboarding Forms</h1>
        <p className="text-sm text-[#717D93] mt-1">
          Configure the fields, sections, and validation rules for each onboarding form.
          Changes take effect immediately for new portal sessions.
        </p>
      </div>

      <div className="grid gap-4">
        {configs.map((config) => (
          <Link
            key={config.id}
            href={`/settings/onboarding-forms/${config.form_key}`}
            className="block"
          >
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 hover:border-[#01A0FF] hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-[#EFF6FF] group-hover:bg-[#01A0FF]/10 transition-colors">
                    <FileText className="w-5 h-5 text-[#01A0FF]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#253859] group-hover:text-[#01A0FF] transition-colors">
                      {config.display_name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {config.description || config.form_key}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex gap-4 text-xs text-[#717D93]">
                      <span>{config.sectionCount} sections</span>
                      <span>{config.fieldCount} fields</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      v{config.version} · {config.updated_at ? new Date(config.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#01A0FF] transition-colors" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 text-[#94A3B8]">
          <Settings2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No form configurations found.</p>
          <p className="text-xs mt-1">Form configurations are created via database migrations.</p>
        </div>
      )}
    </div>
  );
}
