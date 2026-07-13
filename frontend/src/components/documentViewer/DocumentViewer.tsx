import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export function DocumentViewer({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="flex flex-col items-center select-none" onContextMenu={(e) => e.preventDefault()}>
      <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading="Loading document…">
        <Page pageNumber={pageNumber} width={720} renderAnnotationLayer={false} />
      </Document>
      {numPages > 1 && (
        <div className="flex items-center gap-3 mt-3 text-sm">
          <button
            className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            className="px-2 py-1 rounded border border-slate-300 disabled:opacity-40"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
