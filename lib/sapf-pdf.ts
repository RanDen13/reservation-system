import { getSapfParts } from "@/app/components/pages/SAPF/sapfData";
import { format } from "date-fns";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

type PdfMode = "preview" | "approved";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "templates",
  "student-activity-proposal-form-v2.pdf",
);

function asDate(value: any) {
  return value instanceof Date ? value : new Date(value);
}

function short(value: any) {
  return value === null || value === undefined ? "" : String(value);
}

function includes(values: string[], option: string) {
  const normalized = option.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalized);
}

function wrapText(text: string, maxChars: number) {
  const words = short(text).split(/\s+/).filter(Boolean);
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

function fit(text: string, max = 42) {
  const value = short(text);
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
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
  const templateBytes = await readFile(TEMPLATE_PATH);
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (text: string, x: number, y: number, size = 7, isBold = false) => {
    page.drawText(fit(text), {
      x,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawWrapped = (
    text: string,
    x: number,
    y: number,
    maxChars: number,
    maxLines: number,
    size = 6.5,
    lineHeight = 8,
  ) => {
    wrapText(text, maxChars)
      .slice(0, maxLines)
      .forEach((line, index) => {
        page.drawText(line, {
          x,
          y: y - index * lineHeight,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      });
  };

  const mark = (x: number, y: number) => {
    page.drawText("X", {
      x,
      y,
      size: 7.5,
      font: bold,
      color: rgb(0, 0, 0),
    });
  };

  const sapf = request.sapf || getSapfParts(request);
  const part1 = sapf.part1;
  const part2 = sapf.part2;
  const part4 = sapf.part4 || {};
  const startAt = asDate(request.startAt);
  const endAt = asDate(request.endAt);

  draw(part1.activityTitle, 114, 637);
  draw(
    `${format(startAt, "MMM d, yyyy")} ${format(startAt, "h:mm a")}-${format(
      endAt,
      "h:mm a",
    )}`,
    397,
    637,
    6,
  );
  draw(part1.organization, 114, 624);
  draw(part1.department, 328, 624);
  draw(part1.programCourse, 128, 611);
  draw(part1.venue, 312, 611);

  if (part1.modality === "Face-to-face") mark(50, 597);
  if (part1.modality === "Online") mark(128, 597);
  if (part1.modality === "Hybrid") mark(186, 597);
  if (part1.setting === "In-Campus") mark(278, 597);
  if (part1.setting === "Off-Campus") mark(358, 597);

  draw(part1.personnelInCharge, 150, 583);
  if (part1.activityType === "Co-Curricular") mark(278, 583);
  if (part1.activityType === "Extra-Curricular") mark(378, 583);

  draw(part1.attire, 84, 569);
  if (part1.scope === "Organizational") mark(278, 569);
  if (part1.scope === "Institutional") mark(378, 569);
  if (["Regional", "National"].includes(part1.scope)) mark(468, 569);

  draw(short(part1.noOfParticipants), 126, 555);
  draw(part1.program, 252, 555);
  drawWrapped(part1.rationale, 52, 522, 112, 3);
  drawWrapped(part1.objectives, 52, 474, 112, 3);

  const coreY = 426;
  if (includes(part1.coreValues, "Courage")) mark(50, coreY);
  if (includes(part1.coreValues, "Compassion")) mark(132, coreY);
  if (includes(part1.coreValues, "Community-Oriented")) mark(228, coreY);
  if (includes(part1.coreValues, "Humility")) mark(368, coreY);
  if (includes(part1.coreValues, "Interiority")) mark(440, coreY);
  if (includes(part1.coreValues, "Missionary Spirit")) mark(510, coreY);

  if (includes(part1.graduateAttributes, "EGA 1: Critical and Creative Thinker")) mark(50, 398);
  if (
    includes(
      part1.graduateAttributes,
      "EGA 2: Competent Catholic Augustinian-Marian Professional",
    )
  ) mark(302, 398);
  if (includes(part1.graduateAttributes, "EGA 3: Socially Responsive Steward")) mark(50, 385);
  if (includes(part1.graduateAttributes, "EGA 4: Transformative Lifelong Learner")) mark(302, 385);

  drawWrapped(part1.programFlow, 116, 362, 96, 2);
  draw(part1.budget, 90, 339);
  draw(part1.sourceOfBudget, 364, 339);

  if (includes(part2.supportRequests, "Budget")) mark(50, 293);
  if (includes(part2.supportRequests, "Vehicle")) mark(190, 293);
  if (includes(part2.supportRequests, "Food/Snacks")) mark(330, 293);
  if (includes(part2.supportRequests, "Room/Venue")) mark(50, 279);
  if (includes(part2.supportRequests, "Sound System")) mark(190, 279);
  if (includes(part2.supportRequests, "Microphone")) mark(330, 279);
  if (includes(part2.supportRequests, "LCD Projector")) mark(50, 265);
  if (includes(part2.supportRequests, "Chairs and Tables")) mark(190, 265);
  draw(part2.budgetDetails, 118, 293, 6);
  draw(part2.vehiclePassengers, 256, 293, 6);
  draw(part2.foodPax, 410, 293, 6);
  draw(part2.roomVenueDetails, 140, 279, 6);
  draw(part2.microphoneQty, 438, 279, 6);
  draw(part2.otherSupport, 372, 265, 6);

  drawWrapped(sapf.part3, 52, 226, 112, 3);

  if (part4.parentsConsent?.toLowerCase().includes("yes")) mark(156, 177);
  if (part4.parentsConsent?.toLowerCase().includes("not")) mark(208, 177);
  draw(part4.attachments, 450, 177, 6);
  if (part4.academicInterruption?.toLowerCase().includes("yes")) mark(178, 163);
  if (part4.academicInterruption?.toLowerCase().includes("none")) mark(228, 163);
  draw(part4.academicRemarks, 378, 163, 6);
  if (part4.medicalExam?.toLowerCase().includes("yes")) mark(156, 149);
  if (part4.medicalExam?.toLowerCase().includes("not")) mark(208, 149);
  if (part4.reportOfCompliance?.toLowerCase().includes("yes")) mark(252, 135);
  if (part4.reportOfCompliance?.toLowerCase().includes("not")) mark(304, 135);
  draw(part4.studentPersonnelRatio, 532, 135, 6);

  draw(request.officer?.name || "", 56, 103, 6);
  const steps = request.approvalSteps || [];
  const adviser = steps.find((step: any) => step.position === "ADVISER");
  const dean = steps.find((step: any) => step.position === "DEAN");
  const sds = steps.find((step: any) => step.position === "SDS");
  const sas = steps.find((step: any) => step.position === "SAS");
  const finance = steps.find((step: any) => step.position === "ADDITIONAL_SIGNATORY");
  const vpaa = steps.find((step: any) => step.position === "VPAA");
  const president = steps.find((step: any) => step.position === "UNIVERSITY_PRESIDENT");
  draw(adviser?.reviewer?.name || "", 190, 103, 6);
  draw(sds?.reviewer?.name || "", 326, 103, 6);
  draw(dean?.reviewer?.name || "", 56, 61, 6);
  draw(sas?.reviewer?.name || "", 190, 61, 6);
  draw(finance?.reviewer?.name || "", 326, 61, 6);
  draw(vpaa?.reviewer?.name || "", 462, 61, 6);
  draw(president?.reviewer?.name || "", 236, 19, 6);

  if (mode === "approved" && verifyUrl) {
    const verifyPage = pdf.addPage([612, 792]);
    const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
    const qrImage = await pdf.embedPng(qrData);
    verifyPage.drawText("SAPF Approval Verification", {
      x: 48,
      y: 720,
      size: 18,
      font: bold,
    });
    verifyPage.drawText(`Request No: ${request.requestNumber}`, {
      x: 48,
      y: 690,
      size: 11,
      font,
    });
    verifyPage.drawText(`Status: ${request.status}`, {
      x: 48,
      y: 672,
      size: 11,
      font,
    });
    verifyPage.drawText("Scan this QR code to verify the approved reservation.", {
      x: 48,
      y: 642,
      size: 10,
      font,
    });
    verifyPage.drawImage(qrImage, {
      x: 48,
      y: 390,
      width: 180,
      height: 180,
    });
    drawWrappedOnPage(verifyPage, verifyUrl, 48, 360, 90, 3, font);
  }

  return Buffer.from(await pdf.save());
}

function drawWrappedOnPage(
  page: any,
  text: string,
  x: number,
  y: number,
  maxChars: number,
  maxLines: number,
  font: any,
) {
  wrapText(text, maxChars)
    .slice(0, maxLines)
    .forEach((line, index) => {
      page.drawText(line, {
        x,
        y: y - index * 12,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });
}
