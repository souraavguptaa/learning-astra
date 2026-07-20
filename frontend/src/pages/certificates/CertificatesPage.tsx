import { Award, Download } from "lucide-react";
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
      {/* Bento card anatomy: icon-shape badge, divider between header and metadata, footer row
          separated by its own divider — not a flat stack of text (cards.md / lists.md). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {certificates?.map((c) => (
          <div key={c.id} className="hover-lift bg-white rounded-xl shadow-clay flex flex-col overflow-hidden">
            <div className="p-5 flex-1">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-astra-soft text-astra-dark mb-3">
                <Award className="w-5 h-5" />
              </span>
              <div className="font-display font-semibold text-slate-800 leading-snug">{c.trainingTitle}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="bg-emerald-50 text-emerald-700 rounded-pill px-2 py-0.5 text-xs font-medium">
                  {Math.round(Number(c.scorePercentage))}%
                </span>
                <span className="text-slate-400 text-xs">{new Date(c.issuedAt).toLocaleDateString()}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 font-mono">{c.certificateNumber}</div>
            </div>
            <div className="border-t border-black/[0.06] dark:border-white/10 px-5 py-3">
              <button
                onClick={() => handleDownload(c.id)}
                className="inline-flex items-center gap-1.5 text-astra text-sm font-medium hover:underline"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
