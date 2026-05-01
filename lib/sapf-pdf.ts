import { mkdtemp, readFile, rm, writeFile, access } from "fs/promises";
import { execFile } from "child_process";
import { createRequire } from "module";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { renderSapfDocx } from "./sapf-docx";

type PdfMode = "preview" | "approved";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

async function resolveConverterScript(scriptName: string) {
  const candidates = [
    path.join(process.cwd(), "node_modules", "docx2pdf-converter", scriptName),
  ];

  try {
    const packageJsonPath = require.resolve("docx2pdf-converter/package.json");
    candidates.push(path.join(path.dirname(packageJsonPath), scriptName));
  } catch {
    // Fallback to project node_modules only.
  }

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return candidates[0];
}

async function runDocxToPdf(docxPath: string, pdfPath: string) {
  if (process.platform === "win32") {
    const scriptPath = await resolveConverterScript("convert.ps1");
    await access(scriptPath);
    await execFileAsync("powershell", [
      "-File",
      scriptPath,
      docxPath,
      pdfPath,
      "false",
    ]);
    return;
  }

  if (process.platform === "darwin") {
    const scriptPath = await resolveConverterScript("convert.sh");
    await access(scriptPath);
    await execFileAsync("sh", [scriptPath, docxPath, pdfPath, "false"]);
    return;
  }

  if (process.platform === "linux") {
    await execFileAsync("unoconv", ["-f", "pdf", "-o", pdfPath, docxPath]);
    return;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = `${current} ${word}`.trim();
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

async function convertDocxToPdf(docxBytes: Buffer) {
  const dir = await mkdtemp(path.join(tmpdir(), "sapf-pdf-"));
  const docxPath = path.join(dir, "sapf.docx");
  const pdfPath = path.join(dir, "sapf.pdf");

  try {
    await writeFile(docxPath, docxBytes);
    await runDocxToPdf(docxPath, pdfPath);
    return await readFile(pdfPath);
  } catch (error) {
    throw new Error(
      "Failed to convert SAPF DOCX to PDF. In Linux/Docker, docx2pdf-converter requires unoconv and LibreOffice Writer.",
      { cause: error },
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function appendVerificationPage({
  pdfBytes,
  request,
  verifyUrl,
}: {
  pdfBytes: Buffer;
  request: any;
  verifyUrl: string;
}) {
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const verifyPage = pdf.addPage([612, 792]);
  const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
  const qrImage = await pdf.embedPng(qrData);

  verifyPage.drawText("SAPF Approval Verification", {
    x: 48,
    y: 720,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText(`Request No: ${request.requestNumber}`, {
    x: 48,
    y: 690,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText(`Status: ${request.status}`, {
    x: 48,
    y: 672,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawText("Scan this QR code to verify the approved reservation.", {
    x: 48,
    y: 642,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  verifyPage.drawImage(qrImage, {
    x: 48,
    y: 390,
    width: 180,
    height: 180,
  });

  wrapText(verifyUrl, 90)
    .slice(0, 3)
    .forEach((line, index) => {
      verifyPage.drawText(line, {
        x: 48,
        y: 360 - index * 12,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });

  return Buffer.from(await pdf.save());
}

export async function renderSapfPdf({
  request,
  mode,
  verifyUrl,
}: {
  request: any;
  mode: PdfMode;
  verifyUrl?: string;
}) {
  const docxBytes = await renderSapfDocx({ request });
  const pdfBytes = await convertDocxToPdf(docxBytes);

  if (mode === "approved" && verifyUrl) {
    return appendVerificationPage({ pdfBytes, request, verifyUrl });
  }

  return pdfBytes;
}
