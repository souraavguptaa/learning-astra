import { Award } from "lucide-react";
import { useCertificateDownloadUrl, useMyCertificates } from "../../features/assessment.js";

export function CertificatesPage() {
  const { data: certificates, isLoading } = useMyCertificates();
  const downloadUrl = useCertificateDownloadUrl();

  async function handleDownload(id: string) {
    const { url } = await downloadUrl.mutateAsync(id);
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Certificates</h1>
      {isLoading && <p className="text-slate-400">Loading…</p>}
      {certificates?.length === 0 && <p className="text-slate-400">No certificates yet — pass an assessment to earn one.</p>}
      <div className="grid grid-cols-2 gap-4">
        {certificates?.map((c) => (
          <div key={c.id} className="hover-lift bg-white rounded-lg shadow-clay p-5">
            <Award className="w-8 h-8 mb-2 text-astra" />
            <div className="font-semibold text-slate-800 leading-snug">{c.trainingTitle}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 text-xs font-medium">
                {Math.round(Number(c.scorePercentage))}%
              </span>
              <span className="text-slate-400 text-xs">{new Date(c.issuedAt).toLocaleDateString()}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">{c.certificateNumber}</div>
            <button onClick={() => handleDownload(c.id)} className="mt-3 text-astra text-sm font-medium hover:underline">
              Download PDF ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
