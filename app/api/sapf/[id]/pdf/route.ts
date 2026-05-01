import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

function wrap(text: string, max = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sapf = await prisma.sAPFRequest.findUnique({
    where: { id },
    include: {
      officer: true,
      eventSpace: true,
      approvalSteps: {
        include: {
          reviewer: true,
        },
        orderBy: {
          stepOrder: "asc",
        },
      },
      approvalActions: {
        include: {
          actor: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!sapf || sapf.status !== "APPROVED" || !sapf.verificationToken) {
    return NextResponse.json(
      { message: "Approved SAPF not found." },
      { status: 404 },
    );
  }

  const sapfData = sapf as any;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify/${sapf.verificationToken}`;
  const qrData = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180 });
  const qrImage = await pdf.embedPng(qrData);

  let y = 748;
  const draw = (text: string, size = 10, isBold = false) => {
    page.drawText(text, {
      x: 48,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.09, 0.1, 0.13),
    });
    y -= size + 8;
  };

  draw("LA CONSOLACION UNIVERSITY PHILIPPINES", 14, true);
  draw("STUDENT ACTIVITY PROPOSAL FORM - APPROVED COPY", 12, true);
  draw(`Request No: ${sapf.requestNumber}`, 10);
  draw(`Verification: ${verifyUrl}`, 9);
  y -= 10;

  page.drawImage(qrImage, {
    x: 450,
    y: 620,
    width: 110,
    height: 110,
  });

  draw("Activity Details", 12, true);
  draw(`Title: ${sapf.title}`);
  draw(`Organization: ${sapf.organization}`);
  draw(`Department: ${sapf.department}`);
  draw(`Officer: ${sapf.officer.name}`);
  draw(`Venue: ${sapf.eventSpace.name} (${sapf.eventSpace.location})`);
  draw(
    `Schedule: ${sapf.startAt.toLocaleString()} to ${sapf.endAt.toLocaleString()}`,
  );
  draw(`Participants: ${sapf.attendeeCount}`);
  y -= 8;

  draw("Rationale", 12, true);
  for (const line of wrap(String(sapf.rationale || "N/A"))) {
    draw(line, 9);
  }
  y -= 4;

  draw("Objectives", 12, true);
  for (const line of wrap(String(sapf.objectives || "N/A"))) {
    draw(line, 9);
  }
  y -= 8;

  draw("Approval Trail", 12, true);
  for (const step of sapf.approvalSteps) {
    draw(
      `${step.stepOrder}. ${step.label} - ${step.reviewer.name} - ${step.status}${
        step.actedAt ? ` (${step.actedAt.toLocaleDateString()})` : ""
      }`,
      9,
    );
  }

  if (
    sapf.parentsConsent ||
    sapf.attachments ||
    sapf.academicInterruption ||
    sapf.academicRemarks ||
    sapf.medicalExam ||
    sapf.reportOfCompliance ||
    sapf.participantPersonnelRatio
  ) {
    y -= 8;
    draw("SDS Office Clearance", 12, true);
    draw(`Parent Consent: ${sapf.parentsConsent || "N/A"}`, 9);
    draw(`Attachments: ${sapf.attachments || "N/A"}`, 9);
    draw(`Academic Interruption: ${sapf.academicInterruption || "N/A"}`, 9);
    draw(`Medical Exam: ${sapf.medicalExam || "N/A"}`, 9);
    draw(`Report of Compliance: ${sapf.reportOfCompliance || "N/A"}`, 9);
    draw(
      `Participant-Personnel Ratio: ${sapf.participantPersonnelRatio || "N/A"}`,
      9,
    );
  }

  page.drawText(
    "This document is system-generated. Scan the QR code to verify approval.",
    {
      x: 48,
      y: 36,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    },
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sapf.requestNumber}-approved-sapf.pdf"`,
    },
  });
}
