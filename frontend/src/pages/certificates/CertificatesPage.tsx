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
          <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-400">{c.certificateNumber}</div>
            <div className="font-medium mt-1">Score: {c.scorePercentage}%</div>
            <div className="text-xs text-slate-400 mb-3">{new Date(c.issuedAt).toLocaleDateString()}</div>
            <button onClick={() => handleDownload(c.id)} className="text-astra text-sm underline">
              Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
