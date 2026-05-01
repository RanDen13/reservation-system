"use server";

import ActionResult from "@/app/components/ActionResult";
import { provisionMagicAccount } from "@/lib/account-provisioning";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { normalizeSapfRequest } from "./sapfData";

const roleValues = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const approverRoleValues = ["APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const approverPositionValues = [
  "ADVISER",
  "DEAN",
  "SDS",
  "SAS",
  "ADDITIONAL_SIGNATORY",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;
const requiredFixedPositions = [
  "DEAN",
  "SDS",
  "SAS",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;

type UserRoleValue = (typeof roleValues)[number];
type ApproverRoleValue = (typeof approverRoleValues)[number];
type ApproverPositionValue = (typeof approverPositionValues)[number];

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

function field(data: FormData, key: string, fallback = "") {
  return String(data.get(key) ?? fallback).trim();
}

function numberField(data: FormData, key: string, fallback = 0) {
  const parsed = Number(data.get(key) ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function hasOverlap(
  startAt: Date,
  endAt: Date,
  candidateStart: Date,
  candidateEnd: Date,
) {
  return candidateStart < endAt && candidateEnd > startAt;
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
  eventSpaceId: string,
  startAt: Date,
  endAt: Date,
  excludeRequestId?: string,
) {
  const [requests, blocks] = await Promise.all([
    prisma.sAPFRequest.findMany({
      where: {
        eventSpaceId,
        id: excludeRequestId ? { not: excludeRequestId } : undefined,
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
        startAt: true,
        endAt: true,
        status: true,
      },
    }),
    prisma.venueBlock.findMany({
      where: {
        OR: [{ eventSpaceId }, { eventSpaceId: null }],
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
      },
    }),
  ]);

  const overlappingRequests = requests.filter((request) =>
    hasOverlap(startAt, endAt, request.startAt, request.endAt),
  );
  const overlappingBlocks = blocks.filter((block) =>
    hasOverlap(startAt, endAt, block.startAt, block.endAt),
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
    modality: field(data, "modality"),
    programCourse: field(data, "programCourse"),
    venue: field(data, "venue"),
    department: field(data, "department"),
    setting: field(data, "setting"),
    personnelInCharge: field(data, "personnelInCharge"),
    activityType: field(data, "activityType"),
    attire: field(data, "attire"),
    scope: field(data, "scope"),
    noOfParticipants: numberField(data, "noOfParticipants", 1),
    program: field(data, "program"),
    rationale: field(data, "rationale"),
    objectives: field(data, "objectives"),
    coreValues,
    graduateAttributes,
    programFlow: field(data, "programFlow"),
    budget: field(data, "budget"),
    sourceOfBudget: field(data, "sourceOfBudget"),
    supportRequests,
    budgetDetails: field(data, "budgetDetails"),
    vehiclePassengers: field(data, "vehiclePassengers"),
    foodPax: field(data, "foodPax"),
    roomVenueDetails: field(data, "roomVenueDetails"),
    microphoneQty: field(data, "microphoneQty"),
    otherSupport: field(data, "otherSupport"),
    otherDetails: field(data, "otherDetails"),
  };
}

function sapfColumnData(sapf: ReturnType<typeof buildSapfPayload>) {
  return {
    modality: sapf.modality || null,
    programCourse: sapf.programCourse || null,
    venue: sapf.venue || null,
    setting: sapf.setting || null,
    personnelInCharge: sapf.personnelInCharge || null,
    activityType: sapf.activityType || null,
    attire: sapf.attire || null,
    scope: sapf.scope || null,
    program: sapf.program || null,
    rationale: sapf.rationale || null,
    objectives: sapf.objectives || null,
    programFlow: sapf.programFlow || null,
    budget: sapf.budget || null,
    sourceOfBudget: sapf.sourceOfBudget || null,
    budgetDetails: sapf.budgetDetails || null,
    vehiclePassengers: sapf.vehiclePassengers || null,
    foodPax: sapf.foodPax || null,
    roomVenueDetails: sapf.roomVenueDetails || null,
    microphoneQty: sapf.microphoneQty || null,
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
      label:
        position === "SDS"
          ? "SDS/Admin"
          : position
              .replaceAll("_", " ")
              .toLowerCase()
              .replace(/^\w/, (c) => c.toUpperCase()),
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
        sapfRequests: {
          where: {
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
            organization: true,
            startAt: true,
            endAt: true,
            status: true,
          },
          orderBy: {
            startAt: "asc",
          },
        },
        venueBlocks: {
          select: {
            id: true,
            title: true,
            reason: true,
            startAt: true,
            endAt: true,
          },
          orderBy: {
            startAt: "asc",
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
      orderBy: {
        startAt: "asc",
      },
    });

    return {
      success: true,
      data: jsonSafe({ venues, globalBlocks }),
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
          },
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    const grouped = positions.reduce<Record<string, any[]>>((acc, item) => {
      acc[item.position] = acc[item.position] || [];
      acc[item.position].push(item.user);
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
      eventSpace: {
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
        },
      },
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
      approvalSteps: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
              },
              orderBy: { startAt: "desc" },
            })
          : Promise.resolve([]),
      ]);

    const sanitizedRequests = requests.map((request: any) => normalizeSapfRequest({
      ...request,
      approvalSteps: request.approvalSteps.map((step: any) => {
        const thread = step.concernThread;
        const canSeeThread =
          !thread ||
          role === "SUPER_ADMIN" ||
          thread.officerId === user.id ||
          thread.reviewerId === user.id;

        return {
          ...step,
          concernThread: canSeeThread ? thread : null,
        };
      }),
    }));

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
      eventSpace: {
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
        },
      },
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
      approvalSteps: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
          role === "SUPER_ADMIN" ||
          thread.officerId === user.id ||
          thread.reviewerId === user.id;

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
        message: "Only officers can submit SAPF requests.",
      };
    }

    const eventSpaceId = field(data, "eventSpaceId");
    const requestId = field(data, "requestId");
    const intent = field(data, "intent", "draft");
    const date = field(data, "activityDate");
    const startTime = field(data, "startTime");
    const endTime = field(data, "endTime");
    const startAt = localDateTime(date, startTime);
    const endAt = localDateTime(date, endTime);
    const isSubmit = intent === "submit";

    if (!eventSpaceId || !date || !startTime || !endTime) {
      return {
        success: false,
        message: "Venue, date, start time, and end time are required.",
      };
    }

    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      return {
        success: false,
        message: "Please select a valid date and time range.",
      };
    }

    const eventSpace = await prisma.eventSpace.findUnique({
      where: { id: eventSpaceId },
    });

    if (!eventSpace || eventSpace.status !== "ACTIVE") {
      return {
        success: false,
        message: "Selected venue is not available for requests.",
      };
    }

    const attendeeCount = numberField(data, "noOfParticipants", 1);
    if (attendeeCount > eventSpace.capacity) {
      return {
        success: false,
        message: `No. of participants (${attendeeCount}) exceeds venue capacity (${eventSpace.capacity}).`,
      };
    }

    const conflict = await detectConflicts(
      eventSpaceId,
      startAt,
      endAt,
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
        message: "You can only edit your own SAPF requests.",
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

    const requestData = {
      eventSpaceId,
      title,
      organization,
      department,
      attendeeCount,
      startAt,
      endAt,
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
        await replaceSapfListRows(tx, created.id, sapf);
        return created;
      });
    } else {
      request = await prisma.$transaction(async (tx) => {
        const updated = await tx.sAPFRequest.update({
          where: { id: existing.id },
          data: {
            ...requestData,
            status: isSubmit ? ("IN_REVIEW" as any) : existing.status,
            currentStepOrder: isSubmit
              ? (existing.currentStepOrder ?? 1)
              : existing.currentStepOrder,
          },
        });
        await replaceSapfListRows(tx, updated.id, sapf);
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
      } else {
        const returnedStep = existing.approvalSteps.find(
          (step) => step.status === "RETURNED",
        );
        if (returnedStep) {
          await prisma.approvalStep.update({
            where: { id: returnedStep.id },
            data: {
              status: "ACTIVE" as any,
              comment: null,
            },
          });
        }
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
          "SAPF request needs review",
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
          ? "SAPF submitted with a pending-slot warning."
          : "SAPF submitted successfully."
        : "Draft saved.",
    };
  } catch (error) {
    console.error("SAPF save failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to save SAPF request.",
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
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!request) {
      return { success: false, message: "SAPF request not found." };
    }

    const step = request.approvalSteps.find((item) => item.id === stepId);
    if (!step || step.status !== "ACTIVE") {
      return { success: false, message: "This approval step is not active." };
    }

    const role = normalizeRole(user.role);
    if (!role || step.reviewerId !== user.id) {
      return { success: false, message: "You are not assigned to this step." };
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
        "SAPF request rejected",
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
        "SAPF returned for revision",
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

    const part4 =
      step.position === "SDS"
        ? {
            parentsConsent: field(data, "parentsConsent"),
            attachments: field(data, "attachments"),
            academicInterruption: field(data, "academicInterruption"),
            academicRemarks: field(data, "academicRemarks"),
            medicalExam: field(data, "medicalExam"),
            reportOfCompliance: field(data, "reportOfCompliance"),
            studentPersonnelRatio:
              field(data, "studentPersonnelRatio") ||
              field(data, "participantPersonnelRatio"),
          }
        : undefined;

    if (step.position === "SDS" && !part4?.parentsConsent) {
      return {
        success: false,
        message: "SDS Part 4 clearance must be filled before approval.",
      };
    }

    const nextStep = request.approvalSteps.find(
      (item) => item.stepOrder > step.stepOrder && item.status === "PENDING",
    );

    if (!nextStep) {
      const conflict = await detectConflicts(
        request.eventSpaceId,
        request.startAt,
        request.endAt,
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
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: "APPROVED" as any,
          comment: comment || null,
          actedAt: new Date(),
        },
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
      nextStep ? "SAPF step approved" : "SAPF fully approved",
      nextStep
        ? `${step.label} approved ${request.requestNumber}.`
        : `${request.requestNumber} is fully approved. Download the approved SAPF with QR code.`,
      nextStep ? "APPROVAL" : "FINAL",
      request.id,
    );

    if (nextStep) {
      await createNotification(
        nextStep.reviewerId,
        "SAPF request needs review",
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
        approvalSteps: true,
      },
    });

    if (!request) {
      return { success: false, message: "SAPF request not found." };
    }
    const step = request.approvalSteps.find((item) => item.id === stepId);
    if (!step) {
      return { success: false, message: "Approval step not found." };
    }

    const role = normalizeRole(user.role);
    const canMessage =
      role === "SUPER_ADMIN" ||
      request.officerId === user.id ||
      step.reviewerId === user.id;
    if (!canMessage) {
      return {
        success: false,
        message: "You cannot access this private concern thread.",
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

    const notificationTargets =
      role === "SUPER_ADMIN"
        ? [request.officerId, step.reviewerId]
        : [request.officerId === user.id ? step.reviewerId : request.officerId];

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

    await provisionMagicAccount({
      email,
      name: field(data, "name"),
      role: role as UserRoleValue,
    });

    await auth.api.signInMagicLink({
      headers: await headers(),
      body: {
        email,
        callbackURL: "/first-login",
        newUserCallbackURL: "/first-login",
        errorCallbackURL: "/login",
      },
    });

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
        approverPositions: {
          where: { active: true },
          select: {
            position: true,
          },
        },
      },
    });

    return {
      success: true,
      data: jsonSafe({ users }),
    };
  } catch (error) {
    console.error("Accounts load failed:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to load accounts.",
    };
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
    if (userId === user.id && role !== "SUPER_ADMIN") {
      return {
        success: false,
        message: "You cannot remove your own super admin role.",
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

    await prisma.approverPositionUser.updateMany({
      where: { userId },
      data: { active: false },
    });

    await prisma.approverPositionUser.upsert({
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
    const startAt = localDateTime(
      field(data, "date"),
      field(data, "startTime"),
    );
    const endAt = localDateTime(field(data, "date"), field(data, "endTime"));

    if (
      !field(data, "title") ||
      Number.isNaN(startAt.getTime()) ||
      endAt <= startAt
    ) {
      return {
        success: false,
        message: "Block title and valid time range are required.",
      };
    }

    await prisma.venueBlock.create({
      data: {
        id: uuid(),
        eventSpaceId: eventSpaceId === "ALL" ? null : eventSpaceId,
        title: field(data, "title"),
        reason: field(data, "reason") || null,
        startAt,
        endAt,
        createdById: user.id,
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
