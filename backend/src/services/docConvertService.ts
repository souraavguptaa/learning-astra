import libre from "libreoffice-convert";

export class LibreOfficeUnavailableError extends Error {
  constructor() {
    super(
      "LibreOffice (soffice) is not installed or not on PATH. Install it from libreoffice.org to convert PPT/Word/Excel files to PDF.",
    );
    this.name = "LibreOfficeUnavailableError";
  }
}

/** Converts a PPT/Word/Excel file buffer to a PDF buffer via headless LibreOffice. */
export function convertToPdf(fileBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libre.convert(fileBuffer, ".pdf", undefined, (err, pdfBuffer) => {
      if (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/soffice|spawn|ENOENT/i.test(message)) {
          reject(new LibreOfficeUnavailableError());
        } else {
          reject(err);
        }
        return;
      }
      resolve(pdfBuffer);
    });
  });
}
