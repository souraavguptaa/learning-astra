import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export function DocumentViewer({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  // A hardcoded 720px page overflows a phone viewport — measure the actual container instead,
  // capped at 720 so desktop keeps its current size.
  const [pageWidth, setPageWidth] = useState(720);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) setPageWidth(Math.min(720, containerRef.current.clientWidth));
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center select-none w-full"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading="Loading document…">
        <Page pageNumber={pageNumber} width={pageWidth} renderAnnotationLayer={false} />
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
