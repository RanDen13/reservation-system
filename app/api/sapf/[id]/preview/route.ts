import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json(
      { message: "Unauthorized access." },
      { status: 401 },
    );
  }

  const role = session.user.role?.toUpperCase();
  const allowedRoles = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"];
  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "Your account role is not valid." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const requestWhere =
    role === "SUPER_ADMIN"
      ? { id }
      : role === "OFFICER"
        ? { id, officerId: session.user.id }
        : {
            id,
            OR: [
              { approvalSteps: { some: { reviewerId: session.user.id } } },
              { approvalActions: { some: { actorId: session.user.id } } },
            ],
          };

  const sapf = await prisma.sAPFRequest.findFirst({
    where: requestWhere,
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

  if (!sapf) {
    return NextResponse.json(
      { message: "Request not found." },
      { status: 404 },
    );
  }

  const sapfData = sapf as any;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

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
  draw("STUDENT ACTIVITY PROPOSAL FORM - PREVIEW", 12, true);
  draw(`Request No: ${sapf.requestNumber}`, 10);
  draw(`Status: ${sapf.status}`, 10);
  y -= 10;

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

  page.drawText("Preview copy only. This is not an approval certificate.", {
    x: 48,
    y: 36,
    size: 8,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${sapf.requestNumber}-sapf-preview.pdf"`,
    },
  });
}
