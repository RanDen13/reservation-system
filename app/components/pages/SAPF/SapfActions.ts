"use server";

import ActionResult from "@/app/components/ActionResult";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { normalizeSapfRequest } from "./sapfData";
import {
  addSapfCalendarDays,
  formatSapfDateForMessage,
  sapfLocalDateTime,
  startOfSapfDay,
} from "./sapfSchedule";

const roleValues = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const approverRoleValues = ["APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const approverPositionValues = [
  "ADVISER",
  "DEAN",
  "SDS",
  "SAS",
  "ADDITIONAL_SIGNATORY",
  "VPAA_ASSISTANT",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;
const exclusiveApproverPositions = [
  "SAS",
  "VPAA_ASSISTANT",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;
const requiredFixedPositions = [
  "DEAN",
  "SDS",
  "SAS",
  "VPAA_ASSISTANT",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;
const MIN_BOOKING_ADVANCE_DAYS = 30;
const MAX_SDS_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_PROGRAM_FLOW_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const sapfAttachmentMetadataSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  purpose: true,
  createdAt: true,
} as const;

type UserRoleValue = (typeof roleValues)[number];
type ApproverRoleValue = (typeof approverRoleValues)[number];
type ApproverPositionValue = (typeof approverPositionValues)[number];
type ExclusiveApproverPositionValue =
  (typeof exclusiveApproverPositions)[number];

function approverPositionLabel(position: string) {
  if (position === "SDS") return "SDS/Admin";
  if (position === "SAS") return "SAS";
  if (position === "VPAA") return "VPAA";
  if (position === "VPAA_ASSISTANT") return "VPAA Assistant";
  if (position === "UNIVERSITY_PRESIDENT") return "University President";

  return position
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

function normalizeRole(role?: string | null): UserRoleValue | null {
  const upper = role?.toUpperCase();
  return roleValues.includes(upper as UserRoleValue)
    ? (upper as UserRoleValue)
    : null;
}

function requireRole(
  role: string | null | undefined,
  allowed: UserRoleValue[],
) {
  const normalized = normalizeRole(role);
  return normalized ? allowed.includes(normalized) : false;
}

type CredentialTitleClient = typeof prisma | Prisma.TransactionClient;

function field(data: FormData, key: string, fallback = "") {
  return String(data.get(key) ?? fallback).trim();
}

async function setCredentialAccountTitle(
  userId: string,
  title: string,
  db: CredentialTitleClient = prisma,
) {
  const account = await db.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
  });

  if (account) {
    await db.account.update({
      where: { id: account.id },
      data: { title: title || null },
    });
    return;
  }

  if (!title) return;

  await db.account.create({
    data: {
      id: uuid(),
      accountId: userId,
      providerId: "credential",
      userId,
      title,
    },
  });
}

function booleanField(data: FormData, key: string) {
  const value = field(data, key).toLowerCase();
  if (["true", "yes", "1"].includes(value)) return true;
  if (["false", "no", "0"].includes(value)) return false;
  return null;
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "size" in value &&
    "name" in value
  );
}

function uploadFiles(data: FormData, key: string) {
  return data
    .getAll(key)
    .filter(isUploadFile)
    .filter((file) => file.size > 0);
}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function minimumBookingDate() {
  return addSapfCalendarDays(startOfSapfDay(), MIN_BOOKING_ADVANCE_DAYS);
}

function hasOverlap(
  startAt: Date,
  endAt: Date,
  candidateStart: Date,
  candidateEnd: Date,
) {
  return candidateStart < endAt && candidateEnd > startAt;
}

type ScheduleSlot = {
  date: string;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
};

type ScheduleRange = Pick<ScheduleSlot, "startAt" | "endAt">;

function parseScheduleSlots(data: FormData): ScheduleSlot[] {
  const dates = data.getAll("scheduleDate").map(String);
  const startTimes = data.getAll("scheduleStartTime").map(String);
  const endTimes = data.getAll("scheduleEndTime").map(String);
  const length = Math.max(dates.length, startTimes.length, endTimes.length);

  return Array.from({ length }, (_, index) => {
    const date = String(dates[index] ?? "").trim();
    const startTime = String(startTimes[index] ?? "").trim();
    const endTime = String(endTimes[index] ?? "").trim();

    return {
      date,
      startTime,
      endTime,
      startAt: sapfLocalDateTime(date, startTime),
      endAt: sapfLocalDateTime(date, endTime),
    };
  }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

function validateScheduleSlots(
  slots: ScheduleSlot[],
  options: { enforceAdvance?: boolean } = {},
) {
  if (slots.length === 0) {
    throw new Error("Add at least one schedule day.");
  }

  const earliestBookingDate = options.enforceAdvance
    ? minimumBookingDate()
    : null;

  slots.forEach((slot, index) => {
    if (!slot.date || !slot.startTime || !slot.endTime) {
      throw new Error(`Complete the date and time for day ${index + 1}.`);
    }

    if (
      Number.isNaN(slot.startAt.getTime()) ||
      Number.isNaN(slot.endAt.getTime())
    ) {
      throw new Error(`Day ${index + 1} has an invalid date or time.`);
    }

    if (slot.endAt <= slot.startAt) {
      throw new Error(`Day ${index + 1} end time must be later than start.`);
    }

    if (earliestBookingDate && slot.startAt < earliestBookingDate) {
      throw new Error(
        `Reservations must be booked at least ${MIN_BOOKING_ADVANCE_DAYS} days in advance. Choose ${formatSapfDateForMessage(earliestBookingDate)} or later.`,
      );
    }
  });

  const duplicateDate = slots.find(
    (slot, index) =>
      slot.date &&
      slots.findIndex((candidate) => candidate.date === slot.date) !== index,
  );
  if (duplicateDate) {
    throw new Error("Each schedule day must use a different date.");
  }

  const overlappingSlotIndex = slots.findIndex((slot, index) =>
    slots
      .slice(index + 1)
      .some((candidate) =>
        hasOverlap(slot.startAt, slot.endAt, candidate.startAt, candidate.endAt),
      ),
  );
  if (overlappingSlotIndex >= 0) {
    throw new Error("Schedule days must not overlap each other.");
  }
}

function canMessageConcernThread(stepStatus: string) {
  return ["ACTIVE", "RETURNED"].includes(stepStatus);
}

async function nextRequestNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.sAPFRequest.count({
    where: {
      requestNumber: {
        startsWith: `${year}-`,
      },
    },
  });

  return `${year}-${String(count + 1).padStart(3, "0")}`;
}

async function createNotification(
  userId: string,
  title: string,
  body: string,
  type = "REQUEST",
  requestId?: string,
) {
  await prisma.notification.create({
    data: {
      id: uuid(),
      userId,
      title,
      body,
      type: type as any,
      requestId,
    },
  });
}

async function getFirstActiveApprover(position: string) {
  return prisma.approverPositionUser.findFirst({
    where: {
      position: position as any,
      active: true,
      user: {
        banned: {
          not: true,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function detectConflicts(
  venueIds: string[],
  slots: ScheduleRange[],
  excludeRequestId?: string,
) {
  const [requests, blocks] = await Promise.all([
    prisma.sAPFRequest.findMany({
      where: {
        id: excludeRequestId ? { not: excludeRequestId } : undefined,
        venues: {
          some: {
            eventSpaceId: { in: venueIds },
          },
        },
        status: {
          in: [
            "SUBMITTED",
            "IN_REVIEW",
            "RETURNED_FOR_REVISION",
            "APPROVED",
          ] as any,
        },
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        status: true,
        schedules: {
          select: {
            startAt: true,
            endAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    prisma.venueBlock.findMany({
      where: {
        OR: [{ eventSpaceId: { in: venueIds } }, { eventSpaceId: null }],
      },
      select: {
        id: true,
        title: true,
        schedules: {
          select: {
            startAt: true,
            endAt: true,
          },
          orderBy: {
            startAt: "asc",
          },
        },
      },
    }),
  ]);

  const overlapsAnySlot = (ranges: ScheduleRange[]) =>
    slots.some((slot) =>
      ranges.some((range) =>
        hasOverlap(slot.startAt, slot.endAt, range.startAt, range.endAt),
      ),
    );
  const overlappingRequests = requests.filter((request) =>
    overlapsAnySlot(request.schedules),
  );
  const overlappingBlocks = blocks.filter((block) =>
    overlapsAnySlot(block.schedules),
  );

  return {
    hardConflict:
      overlappingBlocks.length > 0 ||
      overlappingRequests.some((request) => request.status === "APPROVED"),
    pendingConflict: overlappingRequests.some(
      (request) => request.status !== "APPROVED",
    ),
    overlappingRequests,
    overlappingBlocks,
  };
}

function requestVenueInclude() {
  return {
    include: {
      eventSpace: {
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  };
}

function buildSapfPayload(data: FormData) {
  const listField = (key: string) => [
    ...new Set(data.getAll(key).map(String).filter(Boolean)),
  ];
  const supportRequests = listField("supportRequests");
  const coreValues = listField("coreValues");
  const graduateAttributes = listField("graduateAttributes");

  return {
    activityTitle: field(data, "activityTitle"),
    organization: field(data, "organization"),
    departmentCategory: field(data, "departmentCategory"),
    modality: field(data, "modality"),
    programCourse: field(data, "programCourse"),
    venue: field(data, "venue"),
    department: field(data, "department"),
    setting: field(data, "setting"),
    offCampAgree: field(data, "offCampAgree"),
    personnelInCharge: field(data, "personnelInCharge"),
    activityType: field(data, "activityType"),
    attire: field(data, "attire"),
    scope: field(data, "scope"),
    noOfParticipants: field(data, "noOfParticipants"),
    program: field(data, "program"),
    rationale: field(data, "rationale"),
    objectives: field(data, "objectives"),
    coreValues,
    graduateAttributes,
    programFlow: field(data, "programFlow"),
    emergencyPlan: field(data, "emergencyPlan"),
    budget: field(data, "budget"),
    sourceOfBudget: field(data, "sourceOfBudget"),
    supportRequests,
    budgetDetails: field(data, "budgetDetails"),
    vehiclePassengers: field(data, "vehiclePassengers"),
    foodPax: field(data, "foodPax"),
    roomVenueDetails: field(data, "roomVenueDetails"),
    microphoneQty: field(data, "microphoneQty"),
    extraProvisions: field(data, "extraProvisions"),
    otherSupport: field(data, "otherSupport"),
    otherDetails: field(data, "otherDetails"),
  };
}

function sapfColumnData(sapf: ReturnType<typeof buildSapfPayload>) {
  return {
    departmentCategory: sapf.departmentCategory || null,
    modality: sapf.modality || null,
    programCourse: sapf.programCourse || null,
    venue: sapf.venue || null,
    setting: sapf.setting || null,
    offCampAgree:
      sapf.setting === "Off-Campus" ? sapf.offCampAgree || null : null,
    personnelInCharge: sapf.personnelInCharge || null,
    activityType: sapf.activityType || null,
    attire: sapf.attire || null,
    scope: sapf.scope || null,
    program: sapf.program || null,
    rationale: sapf.rationale || null,
    objectives: sapf.objectives || null,
    programFlow: sapf.programFlow || null,
    emergencyPlan: sapf.emergencyPlan || null,
    budget: sapf.budget || null,
    sourceOfBudget: sapf.sourceOfBudget || null,
    budgetDetails: sapf.budgetDetails || null,
    vehiclePassengers: sapf.vehiclePassengers || null,
    foodPax: sapf.foodPax || null,
    roomVenueDetails: sapf.roomVenueDetails || null,
    microphoneQty: sapf.microphoneQty || null,
    extraProvisions: sapf.extraProvisions || null,
    otherSupport: sapf.otherSupport || null,
    otherDetails: sapf.otherDetails || null,
  };
}

async function replaceSapfListRows(
  tx: any,
  requestId: string,
  sapf: ReturnType<typeof buildSapfPayload>,
) {
  await Promise.all([
    tx.sAPFCoreValue.deleteMany({ where: { requestId } }),
    tx.sAPFGraduateAttribute.deleteMany({ where: { requestId } }),
    tx.sAPFSupportRequest.deleteMany({ where: { requestId } }),
  ]);

  await Promise.all([
    sapf.coreValues.length
      ? tx.sAPFCoreValue.createMany({
          data: sapf.coreValues.map((value) => ({
            id: uuid(),
            requestId,
            value,
          })),
        })
      : Promise.resolve(),
    sapf.graduateAttributes.length
      ? tx.sAPFGraduateAttribute.createMany({
          data: sapf.graduateAttributes.map((value) => ({
            id: uuid(),
            requestId,
            value,
          })),
        })
      : Promise.resolve(),
    sapf.supportRequests.length
      ? tx.sAPFSupportRequest.createMany({
          data: sapf.supportRequests.map((value) => ({
            id: uuid(),
            requestId,
            value,
          })),
        })
      : Promise.resolve(),
  ]);
}

async function programFlowAttachments(data: FormData, requestId: string) {
  const files = uploadFiles(data, "programFlowAttachments");
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_PROGRAM_FLOW_ATTACHMENT_BYTES) {
    throw new Error(
      `Program flow attachments must total 25 MB or less. Current total is ${formatMegabytes(totalSize)}.`,
    );
  }

  return Promise.all(
    files.map(async (file) => ({
      id: uuid(),
      requestId,
      fileName: file.name || "program-flow-attachment",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      purpose: "PROGRAM_FLOW",
      data: new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>,
    })),
  );
}

async function buildApprovalChain(data: FormData) {
  const adviserId = field(data, "adviserId");
  const additionalSignatoryIds = data
    .getAll("additionalSignatoryIds")
    .map(String)
    .filter(Boolean);

  if (!adviserId) {
    throw new Error("Please select an adviser before submitting.");
  }

  const adviser = await prisma.user.findUnique({
    where: { id: adviserId },
    select: { id: true, name: true },
  });
  if (!adviser) {
    throw new Error("Selected adviser was not found.");
  }

  const steps: Array<{
    id: string;
    stepOrder: number;
    position: string;
    label: string;
    reviewerId: string;
    status: string;
  }> = [
    {
      id: uuid(),
      stepOrder: 1,
      position: "ADVISER",
      label: "Adviser",
      reviewerId: adviser.id,
      status: "ACTIVE",
    },
  ];

  for (const position of requiredFixedPositions) {
    const match = await getFirstActiveApprover(position);
    if (!match) {
      throw new Error(
        `No active approver is configured for ${position.replaceAll("_", " ")}.`,
      );
    }

    steps.push({
      id: uuid(),
      stepOrder: steps.length + 1,
      position,
      label: approverPositionLabel(position),
      reviewerId: match.userId,
      status: "PENDING",
    });
  }

  if (additionalSignatoryIds.length > 0) {
    const insertAt = steps.findIndex((step) => step.position === "VPAA");
    const additionalUsers = await prisma.user.findMany({
      where: {
        id: { in: additionalSignatoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const additionalSteps = additionalUsers.map((user) => ({
      id: uuid(),
      stepOrder: 0,
      position: "ADDITIONAL_SIGNATORY",
      label: `Additional Signatory - ${user.name}`,
      reviewerId: user.id,
      status: "PENDING",
    }));

    steps.splice(insertAt, 0, ...additionalSteps);
    steps.forEach((step, index) => {
      step.stepOrder = index + 1;
      step.status = index === 0 ? "ACTIVE" : "PENDING";
    });
  }

  return steps;
}

export async function getPublicCalendarData(): Promise<ActionResult<any>> {
  try {
    const venues = await prisma.eventSpace.findMany({
      where: {
        status: {
          in: ["ACTIVE", "UNDER_MAINTENANCE"] as any,
        },
      },
      include: {
        amenities: true,
        sapfRequestVenues: {
          where: {
            request: {
              status: {
                in: [
                  "SUBMITTED",
                  "IN_REVIEW",
                  "RETURNED_FOR_REVISION",
                  "APPROVED",
                ] as any,
              },
            },
          },
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
                title: true,
                organization: true,
                status: true,
                schedules: {
                  select: {
                    id: true,
                    startAt: true,
                    endAt: true,
                  },
                  orderBy: {
                    startAt: "asc",
                  },
                },
              },
            },
          },
        },
        venueBlocks: {
          select: {
            id: true,
            title: true,
            reason: true,
            schedules: {
              select: {
                id: true,
                startAt: true,
                endAt: true,
              },
              orderBy: {
                startAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const globalBlocks = await prisma.venueBlock.findMany({
      where: {
        eventSpaceId: null,
      },
      include: {
        schedules: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      data: jsonSafe({
        venues: venues.map((venue: any) => ({
          ...venue,
          sapfRequests: venue.sapfRequestVenues.map(
            (item: any) => item.request,
          ),
        })),
        globalBlocks,
      }),
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || "Failed to load calendar.",
    };
  }
}

export async function getApproverOptions(): Promise<ActionResult<any>> {
  try {
    const positions = await prisma.approverPositionUser.findMany({
      where: {
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            accounts: {
              where: { providerId: "credential" },
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    const grouped = positions.reduce<Record<string, any[]>>((acc, item) => {
      acc[item.position] = acc[item.position] || [];
      const credentialAccount = item.user.accounts[0];
      acc[item.position].push({
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
        role: item.user.role,
        title: credentialAccount?.title || "",
      });
      return acc;
    }, {});

    return {
      success: true,
      data: jsonSafe(grouped),
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || "Failed to load approvers.",
    };
  }
}

export async function getSapfWorkspace(): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, message: "Unauthorized access." };
    }

    const role = normalizeRole(user.role);
    if (!role) {
      return { success: false, message: "Your account role is not valid." };
    }

    const include = {
      officer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      venues: requestVenueInclude(),
      coreValues: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      graduateAttributes: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      supportRequests: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      schedules: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
        },
        orderBy: { startAt: "asc" as const },
      },
      attachments: {
        select: sapfAttachmentMetadataSelect,
        orderBy: { createdAt: "asc" as const },
      },
      approvalSteps: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              accounts: {
                where: { providerId: "credential" },
                select: { title: true },
              },
            },
          },
          concernThread: {
            include: {
              messages: {
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      role: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" as const },
              },
            },
          },
        },
        orderBy: {
          stepOrder: "asc" as const,
        },
      },
      approvalActions: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    };

    const requestWhere =
      role === "SUPER_ADMIN"
        ? {}
        : role === "OFFICER"
          ? { officerId: user.id }
          : {
              OR: [
                { approvalSteps: { some: { reviewerId: user.id } } },
                { approvalActions: { some: { actorId: user.id } } },
              ],
            };

    const [requests, venues, notifications, users, positions, blocks] =
      await Promise.all([
        prisma.sAPFRequest.findMany({
          where: requestWhere,
          include,
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.eventSpace.findMany({
          include: {
            amenities: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        role === "SUPER_ADMIN"
          ? prisma.user.findMany({
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        role === "SUPER_ADMIN"
          ? prisma.approverPositionUser.findMany({
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: [{ position: "asc" }, { createdAt: "desc" }],
            })
          : Promise.resolve([]),
        role === "SUPER_ADMIN"
          ? prisma.venueBlock.findMany({
              include: {
                eventSpace: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                schedules: {
                  select: {
                    id: true,
                    startAt: true,
                    endAt: true,
                  },
                  orderBy: { startAt: "asc" },
                },
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

    const sanitizedRequests = requests.map((request: any) =>
      normalizeSapfRequest({
        ...request,
        approvalSteps: request.approvalSteps.map((step: any) => {
          const thread = step.concernThread;
          const canSeeThread =
            !thread ||
            (role !== "SUPER_ADMIN" &&
              (thread.officerId === user.id || thread.reviewerId === user.id));

          return {
            ...step,
            concernThread: canSeeThread ? thread : null,
          };
        }),
      }),
    );

    return {
      success: true,
      data: jsonSafe({
        me: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        },
        requests: sanitizedRequests,
        venues,
        notifications,
        users,
        positions,
        blocks,
      }),
    };
  } catch (error) {
    console.error("Workspace load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load dashboard.",
    };
  }
}

export async function getSapfRequestById(
  id: string,
): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, message: "Unauthorized access." };
    }

    const role = normalizeRole(user.role);
    if (!role) {
      return { success: false, message: "Your account role is not valid." };
    }

    const include = {
      officer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      venues: requestVenueInclude(),
      coreValues: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      graduateAttributes: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      supportRequests: {
        select: { value: true },
        orderBy: { createdAt: "asc" as const },
      },
      schedules: {
        select: {
          id: true,
          startAt: true,
          endAt: true,
        },
        orderBy: { startAt: "asc" as const },
      },
      attachments: {
        select: sapfAttachmentMetadataSelect,
        orderBy: { createdAt: "asc" as const },
      },
      approvalSteps: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              accounts: {
                where: { providerId: "credential" },
                select: { title: true },
              },
            },
          },
          concernThread: {
            include: {
              messages: {
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      role: true,
                    },
                  },
                },
                orderBy: { createdAt: "asc" as const },
              },
            },
          },
        },
        orderBy: {
          stepOrder: "asc" as const,
        },
      },
      approvalActions: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    };

    const requestWhere =
      role === "SUPER_ADMIN"
        ? { id }
        : role === "OFFICER"
          ? { id, officerId: user.id }
          : {
              id,
              OR: [
                { approvalSteps: { some: { reviewerId: user.id } } },
                { approvalActions: { some: { actorId: user.id } } },
              ],
            };

    const request = await prisma.sAPFRequest.findFirst({
      where: requestWhere,
      include,
    });

    if (!request) {
      return { success: false, message: "Request not found." };
    }

    const sanitizedRequest = normalizeSapfRequest({
      ...request,
      approvalSteps: request.approvalSteps.map((step: any) => {
        const thread = step.concernThread;
        const canSeeThread =
          !thread ||
          (role !== "SUPER_ADMIN" &&
            (thread.officerId === user.id || thread.reviewerId === user.id));

        return {
          ...step,
          concernThread: canSeeThread ? thread : null,
        };
      }),
    });

    return {
      success: true,
      data: jsonSafe({
        me: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        },
        request: sanitizedRequest,
      }),
    };
  } catch (error) {
    console.error("Request load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load request.",
    };
  }
}

export async function saveSapfRequest(
  data: FormData,
): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["OFFICER"])) {
      return {
        success: false,
        message: "Only officers can submit venue reservation requests.",
      };
    }

    const venueIds = [
      ...new Set(
        data
          .getAll("venueIds")
          .map(String)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    const requestId = field(data, "requestId");
    const intent = field(data, "intent", "draft");
    const scheduleSlots = parseScheduleSlots(data);
    validateScheduleSlots(scheduleSlots, { enforceAdvance: true });
    const isSubmit = intent === "submit";

    if (venueIds.length === 0) {
      return {
        success: false,
        message: "Select at least one venue.",
      };
    }

    const selectedVenues = await prisma.eventSpace.findMany({
      where: { id: { in: venueIds } },
      orderBy: { name: "asc" },
    });

    if (
      selectedVenues.length !== venueIds.length ||
      selectedVenues.some((venue) => venue.status !== "ACTIVE")
    ) {
      return {
        success: false,
        message: "One or more selected venues are not available for requests.",
      };
    }

    const attendeeCount = field(data, "noOfParticipants");
    if (!attendeeCount) {
      return {
        success: false,
        message: "No. of participants is required.",
      };
    }

    const conflict = await detectConflicts(
      venueIds,
      scheduleSlots,
      requestId || undefined,
    );
    if (isSubmit && conflict.hardConflict) {
      return {
        success: false,
        message:
          "This slot is blocked or already approved for another request.",
      };
    }

    const sapf = buildSapfPayload(data);
    sapf.venue = selectedVenues.map((venue) => venue.name).join(", ");
    const title = sapf.activityTitle || "Untitled activity";
    const organization = sapf.organization || "Unspecified organization";
    const department = sapf.department || "Unspecified department";

    const existing = requestId
      ? await prisma.sAPFRequest.findUnique({
          where: { id: requestId },
          include: { approvalSteps: true },
        })
      : null;

    if (existing && existing.officerId !== user.id) {
      return {
        success: false,
        message: "You can only edit your own venue reservation requests.",
      };
    }

    if (
      existing &&
      !["DRAFT", "RETURNED_FOR_REVISION"].includes(existing.status)
    ) {
      return {
        success: false,
        message: "Only draft or returned requests can be edited.",
      };
    }

    let request;
    let uploadedProgramFlowAttachments: Array<{
      id: string;
      requestId: string;
      fileName: string;
      mimeType: string;
      size: number;
      purpose: string;
      data: Uint8Array<ArrayBuffer>;
    }> = [];

    const requestData = {
      title,
      organization,
      department,
      attendeeCount,
      conflictWarning: conflict.pendingConflict,
      ...sapfColumnData(sapf),
    };

    if (!existing) {
      const requestNumber = await nextRequestNumber();
      request = await prisma.$transaction(async (tx) => {
        const created = await tx.sAPFRequest.create({
          data: {
            id: uuid(),
            requestNumber,
            officerId: user.id,
            ...requestData,
            status: isSubmit ? ("IN_REVIEW" as any) : ("DRAFT" as any),
            currentStepOrder: isSubmit ? 1 : null,
          },
        });
        await tx.sAPFRequestVenue.createMany({
          data: venueIds.map((venueId) => ({
            id: uuid(),
            requestId: created.id,
            eventSpaceId: venueId,
          })),
        });
        await tx.sAPFRequestSchedule.createMany({
          data: scheduleSlots.map((slot) => ({
            id: uuid(),
            requestId: created.id,
            startAt: slot.startAt,
            endAt: slot.endAt,
          })),
        });
        uploadedProgramFlowAttachments = await programFlowAttachments(
          data,
          created.id,
        );
        if (uploadedProgramFlowAttachments.length > 0) {
          await Promise.all(
            uploadedProgramFlowAttachments.map((attachment) =>
              tx.sAPFAttachment.create({ data: attachment }),
            ),
          );
        }
        await replaceSapfListRows(tx, created.id, sapf);
        return created;
      });
    } else {
      const returnedStep = isSubmit
        ? [...existing.approvalSteps]
            .filter((step) => step.status === "RETURNED")
            .sort((a, b) => a.stepOrder - b.stepOrder)[0]
        : null;

      request = await prisma.$transaction(async (tx) => {
        const updated = await tx.sAPFRequest.update({
          where: { id: existing.id },
          data: {
            ...requestData,
            status: isSubmit ? ("IN_REVIEW" as any) : existing.status,
            currentStepOrder: isSubmit
              ? (returnedStep?.stepOrder ?? existing.currentStepOrder ?? 1)
              : existing.currentStepOrder,
          },
        });
        await tx.sAPFRequestVenue.deleteMany({
          where: { requestId: updated.id },
        });
        await tx.sAPFRequestVenue.createMany({
          data: venueIds.map((venueId) => ({
            id: uuid(),
            requestId: updated.id,
            eventSpaceId: venueId,
          })),
        });
        await tx.sAPFRequestSchedule.deleteMany({
          where: { requestId: updated.id },
        });
        await tx.sAPFRequestSchedule.createMany({
          data: scheduleSlots.map((slot) => ({
            id: uuid(),
            requestId: updated.id,
            startAt: slot.startAt,
            endAt: slot.endAt,
          })),
        });
        uploadedProgramFlowAttachments = await programFlowAttachments(
          data,
          updated.id,
        );
        if (uploadedProgramFlowAttachments.length > 0) {
          await tx.sAPFAttachment.deleteMany({
            where: {
              requestId: updated.id,
              purpose: "PROGRAM_FLOW",
            },
          });
          await Promise.all(
            uploadedProgramFlowAttachments.map((attachment) =>
              tx.sAPFAttachment.create({ data: attachment }),
            ),
          );
        }
        await replaceSapfListRows(tx, updated.id, sapf);

        if (returnedStep) {
          await tx.approvalStep.update({
            where: { id: returnedStep.id },
            data: {
              status: "ACTIVE" as any,
              comment: null,
              actedAt: null,
            },
          });
          await tx.approvalStep.updateMany({
            where: {
              requestId: existing.id,
              stepOrder: { gt: returnedStep.stepOrder },
              status: { in: ["ACTIVE", "RETURNED", "SKIPPED"] as any },
            },
            data: {
              status: "PENDING" as any,
              comment: null,
              actedAt: null,
            },
          });
        }

        return updated;
      });
    }

    if (isSubmit) {
      if (!existing || existing.status === "DRAFT") {
        const chain = await buildApprovalChain(data);
        await prisma.approvalStep.createMany({
          data: chain.map((step) => ({
            ...step,
            requestId: request.id,
            position: step.position as any,
            status: step.status as any,
          })),
        });
      }

      const firstStep = await prisma.approvalStep.findFirst({
        where: { requestId: request.id, status: "ACTIVE" as any },
        include: { reviewer: true },
        orderBy: { stepOrder: "asc" },
      });

      await prisma.approvalAction.create({
        data: {
          id: uuid(),
          requestId: request.id,
          actorId: user.id,
          action:
            existing?.status === "RETURNED_FOR_REVISION"
              ? ("RESUBMITTED" as any)
              : ("SUBMITTED" as any),
          comment: conflict.pendingConflict
            ? "Submitted with a pending-slot conflict warning."
            : null,
        },
      });

      if (firstStep) {
        await createNotification(
          firstStep.reviewerId,
          "Reservation request needs review",
          `${request.requestNumber} - ${request.title} is waiting for your approval.`,
          "APPROVAL",
          request.id,
        );
      }

      if (conflict.pendingConflict) {
        await createNotification(
          user.id,
          "Pending slot warning",
          "Another request is already pending for this slot. Your submission was still recorded.",
          "CONFLICT",
          request.id,
        );
      }
    }

    revalidatePath("/user/dashboard");
    revalidatePath("/user/spaces");
    return {
      success: true,
      data: jsonSafe(request),
      message: isSubmit
        ? conflict.pendingConflict
          ? "Reservation submitted with a pending-slot warning."
          : "Reservation submitted successfully."
        : "Draft saved.",
    };
  } catch (error) {
    console.error("Reservation save failed:", error);
    return {
      success: false,
      message:
        (error as Error).message || "Failed to save venue reservation request.",
    };
  }
}

export async function cancelSapfRequest(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["OFFICER"])) {
      return {
        success: false,
        message: "Only officers can cancel their reservations.",
      };
    }

    const requestId = field(data, "requestId");
    const comment = field(data, "comment") || "Cancelled by officer.";

    const request = await prisma.sAPFRequest.findFirst({
      where: {
        id: requestId,
        officerId: user.id,
      },
      include: {
        approvalSteps: true,
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Reservation request not found.",
      };
    }

    if (["CANCELLED", "REJECTED"].includes(request.status)) {
      return {
        success: false,
        message: "This reservation can no longer be cancelled.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sAPFRequest.update({
        where: { id: request.id },
        data: {
          status: "CANCELLED" as any,
          currentStepOrder: null,
          conflictWarning: false,
        },
      });
      await tx.approvalStep.updateMany({
        where: {
          requestId: request.id,
          status: {
            in: ["PENDING", "ACTIVE", "RETURNED"] as any,
          },
        },
        data: {
          status: "SKIPPED" as any,
          comment,
          actedAt: new Date(),
        },
      });
      await tx.approvalAction.create({
        data: {
          id: uuid(),
          requestId: request.id,
          actorId: user.id,
          action: "CANCELLED" as any,
          comment,
        },
      });
    });

    const reviewerIds = [
      ...new Set(
        request.approvalSteps
          .filter((step) =>
            ["PENDING", "ACTIVE", "RETURNED"].includes(step.status),
          )
          .map((step) => step.reviewerId),
      ),
    ];

    await Promise.all(
      reviewerIds.map((reviewerId) =>
        createNotification(
          reviewerId,
          "Reservation cancelled",
          `${request.requestNumber} was cancelled by the officer.`,
          "REQUEST",
          request.id,
        ),
      ),
    );

    revalidatePath("/user/dashboard");
    revalidatePath("/user/bookings");
    revalidatePath(`/user/bookings/${request.id}`);
    revalidatePath("/user/approvals");
    revalidatePath("/calendar");

    return {
      success: true,
      message: "Reservation cancelled.",
    };
  } catch (error) {
    console.error("Reservation cancellation failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to cancel reservation.",
    };
  }
}

async function getOrCreateThread(request: any, step: any) {
  const existing = await prisma.concernThread.findUnique({
    where: { approvalStepId: step.id },
  });
  if (existing) return existing;

  return prisma.concernThread.create({
    data: {
      id: uuid(),
      requestId: request.id,
      approvalStepId: step.id,
      officerId: request.officerId,
      reviewerId: step.reviewerId,
    },
  });
}

async function parseSdsClearancePayload(data: FormData, requestId: string) {
  const parentsConsent = booleanField(data, "parentsConsent");
  const hasAttachments = booleanField(data, "hasAttachments");
  const academicInterruption = booleanField(data, "academicInterruption");
  const medicalExam = booleanField(data, "medicalExam");
  const reportOfCompliance = booleanField(data, "reportOfCompliance");
  const missingFields = [
    ["Parent's Consent Form", parentsConsent],
    ["Attachments", hasAttachments],
    ["Academic Class Interruption", academicInterruption],
    ["Medical Exam Request", medicalExam],
    ["Report of Compliance", reportOfCompliance],
  ]
    .filter(([, value]) => value === null)
    .map(([label]) => label);

  if (missingFields.length > 0) {
    throw new Error(
      `Please choose Yes or No for: ${missingFields.join(", ")}.`,
    );
  }

  const attachmentFiles = uploadFiles(data, "attachmentFiles");
  const totalAttachmentSize = attachmentFiles.reduce(
    (sum, file) => sum + file.size,
    0,
  );

  if (totalAttachmentSize > MAX_SDS_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachments must total 25 MB or less. Current total is ${formatMegabytes(totalAttachmentSize)}.`,
    );
  }

  const existingAttachmentCount = await prisma.sAPFAttachment.count({
    where: { requestId, purpose: "SDS_CLEARANCE" },
  });

  if (
    hasAttachments === true &&
    attachmentFiles.length === 0 &&
    existingAttachmentCount === 0
  ) {
    throw new Error(
      "Add at least one attachment or choose No for attachments.",
    );
  }

  const uploadedAttachments =
    hasAttachments === true
      ? await Promise.all(
          attachmentFiles.map(async (file) => ({
            id: uuid(),
            requestId,
            fileName: file.name || "attachment",
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            purpose: "SDS_CLEARANCE",
            data: new Uint8Array(
              await file.arrayBuffer(),
            ) as Uint8Array<ArrayBuffer>,
          })),
        )
      : [];
  const shouldReplaceAttachments =
    hasAttachments === false || uploadedAttachments.length > 0;

  return {
    part4: {
      parentsConsent: parentsConsent as boolean,
      hasAttachments: hasAttachments as boolean,
      academicInterruption: academicInterruption as boolean,
      academicInterruptionRemarks:
        field(data, "academicInterruptionRemarks") || null,
      medicalExam: medicalExam as boolean,
      reportOfCompliance: reportOfCompliance as boolean,
      studentPersonnelRatio:
        field(data, "studentPersonnelRatio") ||
        field(data, "participantPersonnelRatio") ||
        null,
    },
    uploadedAttachments,
    shouldReplaceAttachments,
  };
}

export async function reviewSapfRequest(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["APPROVER", "ADMIN"])) {
      return { success: false, message: "Reviewer access required." };
    }

    const action = field(data, "action");
    const requestId = field(data, "requestId");
    const stepId = field(data, "stepId");
    const comment = field(data, "comment");

    const request = await prisma.sAPFRequest.findUnique({
      where: { id: requestId },
      include: {
        officer: true,
        venues: true,
        schedules: {
          orderBy: { startAt: "asc" },
        },
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Venue reservation request not found.",
      };
    }

    const step = request.approvalSteps.find((item) => item.id === stepId);
    if (!step || step.status !== "ACTIVE") {
      return { success: false, message: "This approval step is not active." };
    }

    const role = normalizeRole(user.role);
    if (!role || step.reviewerId !== user.id) {
      return { success: false, message: "You are not assigned to this step." };
    }

    const requiresDeanSelection =
      action === "approve" && step.position === "ADVISER";
    let selectedDeanId: string | null = null;
    const deanStep = requiresDeanSelection
      ? request.approvalSteps.find((item) => item.position === "DEAN")
      : null;

    if (requiresDeanSelection) {
      const deanId = field(data, "deanId");
      if (!deanId) {
        return {
          success: false,
          message: "Please select a dean for the next approval.",
        };
      }

      const deanPosition = await prisma.approverPositionUser.findFirst({
        where: {
          userId: deanId,
          position: "DEAN" as any,
          active: true,
        },
        select: { userId: true },
      });

      if (!deanPosition) {
        return {
          success: false,
          message: "Selected dean is not an active approver.",
        };
      }

      if (!deanStep) {
        return {
          success: false,
          message: "Dean approval step is missing from this request.",
        };
      }

      selectedDeanId = deanPosition.userId;
    }

    if (action === "return" && !comment) {
      return { success: false, message: "A revision comment is required." };
    }
    if (action === "reject" && !comment) {
      return { success: false, message: "A rejection reason is required." };
    }

    if (action === "reject") {
      await prisma.$transaction(async (tx) => {
        await tx.approvalStep.update({
          where: { id: step.id },
          data: { status: "REJECTED" as any, comment, actedAt: new Date() },
        });
        await tx.concernThread.updateMany({
          where: { approvalStepId: step.id },
          data: { status: "RESOLVED" as any },
        });
        await tx.sAPFRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED" as any,
            rejectionReason: comment,
          },
        });
        await tx.approvalAction.create({
          data: {
            id: uuid(),
            requestId: request.id,
            stepId: step.id,
            actorId: user.id,
            action: "REJECTED" as any,
            comment,
          },
        });
      });

      await createNotification(
        request.officerId,
        "Reservation request rejected",
        `${request.requestNumber} was rejected: ${comment}`,
        "REJECTION",
        request.id,
      );
      revalidatePath("/user/dashboard");
      return { success: true, message: "Request rejected." };
    }

    if (action === "return") {
      const thread = await getOrCreateThread(request, step);
      await prisma.$transaction(async (tx) => {
        await tx.approvalStep.update({
          where: { id: step.id },
          data: { status: "RETURNED" as any, comment, actedAt: new Date() },
        });
        await tx.concernThread.updateMany({
          where: { id: thread.id },
          data: { status: "OPEN" as any },
        });
        await tx.sAPFRequest.update({
          where: { id: request.id },
          data: {
            status: "RETURNED_FOR_REVISION" as any,
            currentStepOrder: step.stepOrder,
          },
        });
        await tx.approvalAction.create({
          data: {
            id: uuid(),
            requestId: request.id,
            stepId: step.id,
            actorId: user.id,
            action: "RETURNED" as any,
            comment,
          },
        });
        await tx.concernMessage.create({
          data: {
            id: uuid(),
            threadId: thread.id,
            authorId: user.id,
            body: comment,
          },
        });
      });

      await createNotification(
        request.officerId,
        "Reservation returned for revision",
        `${request.requestNumber} was returned by ${step.label}: ${comment}`,
        "REVISION",
        request.id,
      );
      revalidatePath("/user/dashboard");
      return { success: true, message: "Request returned for revision." };
    }

    if (action !== "approve") {
      return { success: false, message: "Invalid review action." };
    }

    let part4:
      | {
          parentsConsent: boolean;
          hasAttachments: boolean;
          academicInterruption: boolean;
          academicInterruptionRemarks: string | null;
          medicalExam: boolean;
          reportOfCompliance: boolean;
          studentPersonnelRatio: string | null;
        }
      | undefined;
    let uploadedAttachments: Array<{
      id: string;
      requestId: string;
      fileName: string;
      mimeType: string;
      size: number;
      purpose: string;
      data: Uint8Array<ArrayBuffer>;
    }> = [];
    let shouldReplaceAttachments = false;

    if (step.position === "SDS") {
      const parsed = await parseSdsClearancePayload(data, request.id);
      part4 = parsed.part4;
      uploadedAttachments = parsed.uploadedAttachments;
      shouldReplaceAttachments = parsed.shouldReplaceAttachments;
    }

    const nextStep = request.approvalSteps.find(
      (item) => item.stepOrder > step.stepOrder && item.status === "PENDING",
    );

    if (!nextStep) {
      const conflict = await detectConflicts(
        request.venues.map((venue) => venue.eventSpaceId),
        request.schedules,
        request.id,
      );
      if (conflict.hardConflict) {
        return {
          success: false,
          message:
            "Final approval blocked because the slot now has an approved reservation or venue block.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      if (selectedDeanId && deanStep) {
        await tx.approvalStep.update({
          where: { id: deanStep.id },
          data: { reviewerId: selectedDeanId },
        });
      }

      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: "APPROVED" as any,
          comment: comment || null,
          actedAt: new Date(),
        },
      });
      await tx.concernThread.updateMany({
        where: { approvalStepId: step.id },
        data: { status: "RESOLVED" as any },
      });
      await tx.approvalAction.create({
        data: {
          id: uuid(),
          requestId: request.id,
          stepId: step.id,
          actorId: user.id,
          action: "APPROVED" as any,
          comment: comment || null,
        },
      });

      if (part4 && shouldReplaceAttachments) {
        await tx.sAPFAttachment.deleteMany({
          where: {
            requestId: request.id,
            purpose: "SDS_CLEARANCE",
          },
        });
        if (part4.hasAttachments && uploadedAttachments.length > 0) {
          await Promise.all(
            uploadedAttachments.map((attachment) =>
              tx.sAPFAttachment.create({ data: attachment }),
            ),
          );
        }
      }

      if (nextStep) {
        await tx.approvalStep.update({
          where: { id: nextStep.id },
          data: { status: "ACTIVE" as any },
        });
        await tx.sAPFRequest.update({
          where: { id: request.id },
          data: {
            status: "IN_REVIEW" as any,
            currentStepOrder: nextStep.stepOrder,
            ...(part4 || {}),
          },
        });
      } else {
        await tx.sAPFRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED" as any,
            currentStepOrder: null,
            approvedAt: new Date(),
            verificationToken: uuid(),
            ...(part4 || {}),
          },
        });
        await tx.approvalAction.create({
          data: {
            id: uuid(),
            requestId: request.id,
            actorId: user.id,
            action: "FINALIZED" as any,
            comment: "Reservation finalized and slot locked.",
          },
        });
      }
    });

    await createNotification(
      request.officerId,
      nextStep ? "Reservation step approved" : "Reservation fully approved",
      nextStep
        ? `${step.label} approved ${request.requestNumber}.`
        : `${request.requestNumber} is fully approved. Download the approved reservation with QR code.`,
      nextStep ? "APPROVAL" : "FINAL",
      request.id,
    );

    if (nextStep) {
      const nextReviewerId =
        selectedDeanId && nextStep.position === "DEAN"
          ? selectedDeanId
          : nextStep.reviewerId;
      await createNotification(
        nextReviewerId,
        "Reservation request needs review",
        `${request.requestNumber} - ${request.title} is waiting for your approval.`,
        "APPROVAL",
        request.id,
      );
    }

    revalidatePath("/user/dashboard");
    return {
      success: true,
      message: nextStep ? "Step approved." : "Request fully approved.",
    };
  } catch (error) {
    console.error("Review failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to review request.",
    };
  }
}

export async function updateSdsClearance(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["APPROVER", "ADMIN"])) {
      return { success: false, message: "SDS access required." };
    }

    const requestId = field(data, "requestId");
    const request = await prisma.sAPFRequest.findUnique({
      where: { id: requestId },
      include: {
        approvalSteps: true,
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Venue reservation request not found.",
      };
    }

    const sdsStep = request.approvalSteps.find(
      (step) =>
        step.position === "SDS" &&
        step.reviewerId === user.id &&
        step.status === "APPROVED",
    );

    if (!sdsStep) {
      return {
        success: false,
        message: "You can only edit SDS clearance after approving this step.",
      };
    }

    if (["APPROVED", "REJECTED", "CANCELLED"].includes(request.status)) {
      return {
        success: false,
        message: "SDS clearance is locked after the request is completed.",
      };
    }

    const { part4, uploadedAttachments, shouldReplaceAttachments } =
      await parseSdsClearancePayload(data, request.id);

    await prisma.$transaction(async (tx) => {
      if (shouldReplaceAttachments) {
        await tx.sAPFAttachment.deleteMany({
          where: {
            requestId: request.id,
            purpose: "SDS_CLEARANCE",
          },
        });
        if (part4.hasAttachments && uploadedAttachments.length > 0) {
          await Promise.all(
            uploadedAttachments.map((attachment) =>
              tx.sAPFAttachment.create({ data: attachment }),
            ),
          );
        }
      }

      await tx.sAPFRequest.update({
        where: { id: request.id },
        data: part4,
      });
      await tx.approvalAction.create({
        data: {
          id: uuid(),
          requestId: request.id,
          stepId: sdsStep.id,
          actorId: user.id,
          action: "COMMENTED" as any,
          comment: "SDS Office Clearance updated.",
        },
      });
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/approvals");
    revalidatePath(`/user/approvals/${request.id}`);
    revalidatePath(`/user/bookings/${request.id}`);

    return { success: true, message: "SDS clearance updated." };
  } catch (error) {
    console.error("SDS clearance update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update SDS clearance.",
    };
  }
}

export async function updateSdsEvaluation(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["APPROVER", "ADMIN"])) {
      return { success: false, message: "SDS access required." };
    }

    const requestId = field(data, "requestId");
    const request = await prisma.sAPFRequest.findUnique({
      where: { id: requestId },
      include: {
        approvalSteps: true,
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Venue reservation request not found.",
      };
    }

    const sdsStep = request.approvalSteps.find(
      (step) => step.position === "SDS" && step.reviewerId === user.id,
    );

    if (!sdsStep) {
      return {
        success: false,
        message: "Only the assigned SDS reviewer can edit Part 6.",
      };
    }

    if (request.status !== "APPROVED") {
      return {
        success: false,
        message: "Part 6 is available only after the request is completed.",
      };
    }

    await prisma.sAPFRequest.update({
      where: { id: request.id },
      data: {
        conductedRemarks: field(data, "conductedRemarks"),
        cancelledRemarks: field(data, "cancelledRemarks"),
      },
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/approvals");
    revalidatePath(`/user/approvals/${request.id}`);
    revalidatePath(`/user/bookings/${request.id}`);

    return { success: true, message: "Part 6 evaluation updated." };
  } catch (error) {
    console.error("SDS evaluation update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update Part 6.",
    };
  }
}

export async function addConcernMessage(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, message: "Unauthorized access." };
    }

    const requestId = field(data, "requestId");
    const stepId = field(data, "stepId");
    const body = field(data, "body");
    if (!body) {
      return { success: false, message: "Message cannot be empty." };
    }

    const request = await prisma.sAPFRequest.findUnique({
      where: { id: requestId },
      include: {
        approvalSteps: {
          include: {
            concernThread: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return {
        success: false,
        message: "Venue reservation request not found.",
      };
    }
    const step = request.approvalSteps.find((item) => item.id === stepId);
    if (!step) {
      return { success: false, message: "Approval step not found." };
    }

    const role = normalizeRole(user.role);
    const isOfficer = request.officerId === user.id;
    const isReviewer = step.reviewerId === user.id;
    const canMessage =
      role !== "SUPER_ADMIN" &&
      (isOfficer || isReviewer) &&
      canMessageConcernThread(step.status) &&
      (step.concernThread?.status ?? "OPEN") !== "RESOLVED";
    if (!canMessage) {
      return {
        success: false,
        message: "This concern thread is closed.",
      };
    }

    const thread = await getOrCreateThread(request, step);
    await prisma.concernMessage.create({
      data: {
        id: uuid(),
        threadId: thread.id,
        authorId: user.id,
        body,
      },
    });

    await prisma.approvalAction.create({
      data: {
        id: uuid(),
        requestId: request.id,
        stepId: step.id,
        actorId: user.id,
        action: "COMMENTED" as any,
        comment: body,
      },
    });

    const notificationTargets = [
      isOfficer ? step.reviewerId : request.officerId,
    ];

    await Promise.all(
      notificationTargets
        .filter((id, index, ids) => id !== user.id && ids.indexOf(id) === index)
        .map((id) =>
          createNotification(
            id,
            "New private concern message",
            `${user.name} commented on ${request.requestNumber}.`,
            "COMMENT",
            request.id,
          ),
        ),
    );

    revalidatePath("/user/dashboard");
    return { success: true, message: "Message sent." };
  } catch (error) {
    console.error("Message failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to send message.",
    };
  }
}

export async function createManagedAccount(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can create accounts.",
      };
    }

    const role = field(data, "role").toUpperCase();
    if (!roleValues.includes(role as UserRoleValue)) {
      return { success: false, message: "Invalid role." };
    }

    const email = field(data, "email").toLowerCase();
    const title = field(data, "title");

    if (!email) {
      return { success: false, message: "Email is required." };
    }
    if (!field(data, "name")) {
      return { success: false, message: "Name is required." };
    }
    if (title.length > 120) {
      return {
        success: false,
        message: "Title must be 120 characters or less.",
      };
    }

    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email,
        callbackURL: "/first-login",
        newUserCallbackURL: "/first-login",
        errorCallbackURL: "/login",
      },
    });

    const createdUser = await auth.api.createUser({
      headers: await headers(),
      body: {
        email,
        name: field(data, "name"),
      },
    });

    if (!createdUser?.user) {
      throw new Error("Error creating user");
    }

    await prisma.user.update({
      where: { id: createdUser.user.id },
      data: { role },
    });
    await setCredentialAccountTitle(createdUser.user.id, title);

    revalidatePath("/user/dashboard");
    revalidatePath("/user/accounts");
    return {
      success: true,
      message: "Account created. A magic code was sent to the user.",
    };
  } catch (error) {
    console.error("Account create failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to create account.",
    };
  }
}

export async function getAccountsWorkspace(): Promise<ActionResult<any>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can view accounts.",
      };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        accounts: {
          where: { providerId: "credential" },
          select: {
            password: true,
            title: true,
          },
        },
        approverPositions: {
          where: { active: true },
          select: {
            position: true,
          },
        },
      },
    });

    const normalizedUsers = users.map((account) => {
      const credentialAccount = account.accounts[0];
      const hasPassword = account.accounts.some((entry) =>
        Boolean(entry.password),
      );
      const status = account.banned
        ? "INACTIVE"
        : hasPassword
          ? "ACTIVE"
          : "PENDING";

      return {
        ...account,
        title: credentialAccount?.title || "",
        status,
      };
    });

    return {
      success: true,
      data: jsonSafe({ users: normalizedUsers, currentUserId: user.id }),
    };
  } catch (error) {
    console.error("Accounts load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load accounts.",
    };
  }
}

export async function sendMagicEmail(
  email: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can send magic codes.",
      };
    }

    const targetEmail = String(email || "")
      .trim()
      .toLowerCase();
    if (!targetEmail) {
      return { success: false, message: "Email is required." };
    }

    const hasCredential = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        password: { not: null },
        user: { email: targetEmail },
      },
    });

    if (hasCredential) {
      throw new Error("User already has a password set");
    }

    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email: targetEmail,
        callbackURL: "/first-login",
        newUserCallbackURL: "/first-login",
        errorCallbackURL: "/login",
      },
    });

    revalidatePath("/user/accounts");
    return { success: true, message: "Magic code sent." };
  } catch (error) {
    console.error("Error sending magic email: ", (error as Error).message);
    return {
      success: false,
      message: "Failed to send magic email: " + (error as Error).message,
    };
  }
}

export async function deactivateAccount(
  userId: string[],
  banReason?: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can deactivate accounts.",
      };
    }

    if (userId.includes(user.id)) {
      return {
        success: false,
        message: "You cannot deactivate your own account.",
      };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userId } },
      select: { id: true },
    });

    for (const target of users) {
      await auth.api.banUser({
        body: {
          userId: target.id,
          banReason,
        },
        headers: await headers(),
      });

      await auth.api.revokeUserSessions({
        body: {
          userId: target.id,
        },
        headers: await headers(),
      });

      await prisma.user.update({
        where: { id: target.id },
        data: { banned: true, banReason: banReason || null, banExpires: null },
      });
    }

    revalidatePath("/user/accounts");
    revalidatePath("/user/dashboard");
    return { success: true, message: "Account deactivated." };
  } catch (error) {
    console.error("Error deactivating account:", error);
    return { success: false, message: "Failed to deactivate account" };
  }
}

export async function reactivateAccount(
  userId: string[],
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can reactivate accounts.",
      };
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userId } },
      select: { id: true },
    });

    for (const target of users) {
      await auth.api.unbanUser({
        body: {
          userId: target.id,
        },
        headers: await headers(),
      });

      await prisma.user.update({
        where: { id: target.id },
        data: { banned: false, banReason: null, banExpires: null },
      });
    }

    revalidatePath("/user/accounts");
    revalidatePath("/user/dashboard");
    return { success: true, message: "Account activated." };
  } catch (error) {
    console.error("Error unbanning account:", error);
    return { success: false, message: "Failed to unban account" };
  }
}

export async function updateManagedRole(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can change roles.",
      };
    }

    const userId = field(data, "userId");
    const role = field(data, "role").toUpperCase();
    if (!userId) {
      return { success: false, message: "User is required." };
    }
    if (!roleValues.includes(role as UserRoleValue)) {
      return { success: false, message: "Invalid role." };
    }
    if (userId === user.id) {
      return {
        success: false,
        message: "You cannot change your own role.",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    if (!approverRoleValues.includes(role as ApproverRoleValue)) {
      await prisma.approverPositionUser.updateMany({
        where: { userId },
        data: { active: false },
      });
    }

    revalidatePath("/user/accounts");
    revalidatePath("/user/dashboard");
    return { success: true, message: "Role updated." };
  } catch (error) {
    console.error("Role update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update role.",
    };
  }
}

export async function updateManagedName(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can change user names.",
      };
    }

    const userId = field(data, "userId");
    const name = field(data, "name");
    const title = field(data, "title");
    if (!userId) {
      return { success: false, message: "User is required." };
    }
    if (name.length < 2) {
      return { success: false, message: "Name must be at least 2 characters." };
    }
    if (title.length > 120) {
      return {
        success: false,
        message: "Title must be 120 characters or less.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name },
      });
      await setCredentialAccountTitle(userId, title, tx);
    });

    revalidatePath("/user/accounts");
    revalidatePath("/user/dashboard");
    revalidatePath("/user/approvals");
    revalidatePath("/user/bookings");
    return { success: true, message: "Account details updated." };
  } catch (error) {
    console.error("Account name update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update name.",
    };
  }
}

export async function updateApproverPosition(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can change positions.",
      };
    }

    const userId = field(data, "userId");
    const positionInput = field(data, "position").toUpperCase();
    if (!userId) {
      return { success: false, message: "User is required." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!targetUser) {
      return { success: false, message: "User not found." };
    }

    const targetRole = targetUser.role?.toUpperCase();
    if (!approverRoleValues.includes(targetRole as ApproverRoleValue)) {
      return {
        success: false,
        message: "Only approver roles can have positions.",
      };
    }

    if (targetRole === "SUPER_ADMIN") {
      return {
        success: false,
        message: "Super admin accounts cannot have positions.",
      };
    }

    if (positionInput === "NONE") {
      await prisma.approverPositionUser.updateMany({
        where: { userId },
        data: { active: false },
      });
      revalidatePath("/user/accounts");
      revalidatePath("/user/dashboard");
      return { success: true, message: "Position cleared." };
    }

    if (
      !approverPositionValues.includes(positionInput as ApproverPositionValue)
    ) {
      return { success: false, message: "Invalid position." };
    }

    const isExclusive = exclusiveApproverPositions.includes(
      positionInput as ExclusiveApproverPositionValue,
    );

    await prisma.$transaction(async (tx) => {
      if (isExclusive) {
        const currentHolders = await tx.approverPositionUser.findMany({
          where: {
            position: positionInput as any,
            active: true,
            userId: { not: userId },
          },
          select: { userId: true },
        });
        const holderIds = currentHolders.map((holder) => holder.userId);
        if (holderIds.length > 0) {
          await tx.approverPositionUser.updateMany({
            where: { userId: { in: holderIds }, active: true },
            data: { active: false },
          });
        }
      }

      await tx.approverPositionUser.updateMany({
        where: { userId },
        data: { active: false },
      });

      await tx.approverPositionUser.upsert({
        where: {
          userId_position: {
            userId,
            position: positionInput as any,
          },
        },
        create: {
          id: uuid(),
          userId,
          position: positionInput as any,
          active: true,
        },
        update: {
          active: true,
        },
      });
    });

    revalidatePath("/user/accounts");
    revalidatePath("/user/dashboard");
    return { success: true, message: "Position updated." };
  } catch (error) {
    console.error("Position update failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update position.",
    };
  }
}

export async function assignApproverPosition(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can configure approvers.",
      };
    }

    const userId = field(data, "userId");
    const position = field(data, "position");
    if (!userId || !position) {
      return { success: false, message: "User and position are required." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!targetUser) {
      return { success: false, message: "User not found." };
    }

    const targetRole = targetUser.role?.toUpperCase();
    if (!approverRoleValues.includes(targetRole as ApproverRoleValue)) {
      return {
        success: false,
        message: "Only approver roles can have positions.",
      };
    }

    if (targetRole === "SUPER_ADMIN") {
      return {
        success: false,
        message: "Super admin accounts cannot have positions.",
      };
    }

    await prisma.approverPositionUser.upsert({
      where: {
        userId_position: {
          userId,
          position: position as any,
        },
      },
      create: {
        id: uuid(),
        userId,
        position: position as any,
        active: true,
      },
      update: {
        active: true,
      },
    });

    revalidatePath("/user/dashboard");
    revalidatePath("/user/accounts");
    return { success: true, message: "Approver position assigned." };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || "Failed to assign position.",
    };
  }
}

export async function removeApproverPosition(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can configure approvers.",
      };
    }

    await prisma.approverPositionUser.delete({
      where: { id },
    });
    revalidatePath("/user/dashboard");
    return { success: true, message: "Approver position removed." };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || "Failed to remove position.",
    };
  }
}

export async function createVenueBlock(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const user = await getSessionUser();
    if (!user || !requireRole(user.role, ["SUPER_ADMIN"])) {
      return {
        success: false,
        message: "Only super admins can block venue dates.",
      };
    }

    const eventSpaceId = field(data, "eventSpaceId");
    const scheduleSlots = parseScheduleSlots(data);
    validateScheduleSlots(scheduleSlots);

    if (!field(data, "title")) {
      return {
        success: false,
        message: "Block title is required.",
      };
    }

    await prisma.venueBlock.create({
      data: {
        id: uuid(),
        eventSpaceId: eventSpaceId === "ALL" ? null : eventSpaceId,
        title: field(data, "title"),
        reason: field(data, "reason") || null,
        createdById: user.id,
        schedules: {
          createMany: {
            data: scheduleSlots.map((slot) => ({
              id: uuid(),
              startAt: slot.startAt,
              endAt: slot.endAt,
            })),
          },
        },
      },
    });

    revalidatePath("/calendar");
    revalidatePath("/user/dashboard");
    return { success: true, message: "Venue block created." };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message || "Failed to create venue block.",
    };
  }
}
