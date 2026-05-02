import { getSapfParts } from "@/app/components/pages/SAPF/sapfData";
import { format } from "date-fns";
import Docxtemplater from "docxtemplater";
import { readFile } from "fs/promises";
import path from "path";
import PizZip from "pizzip";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "templates",
  "student-activity-proposal-form-v2.docx",
);

function asDate(value: any) {
  return value instanceof Date ? value : new Date(value);
}

function short(value: any) {
  return value === null || value === undefined ? "" : String(value);
}

function marker(value: boolean) {
  return value ? "X" : "  ";
}

function same(value: any, option: string) {
  return short(value).toLowerCase() === option.toLowerCase();
}

function includes(values: string[], option: string) {
  const normalized = option.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalized);
}

function contains(value: any, option: string) {
  return short(value).toLowerCase().includes(option.toLowerCase());
}

function positive(value: any) {
  if (typeof value === "boolean") return value;
  return contains(value, "yes") || same(value, "true") || same(value, "1");
}

function negative(value: any) {
  if (typeof value === "boolean") return !value;
  return (
    contains(value, "not") ||
    contains(value, "none") ||
    same(value, "no") ||
    same(value, "false") ||
    same(value, "0")
  );
}

function schoolYear(date: Date) {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 5 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function programIncludes(program: string, ...matches: string[]) {
  const normalized = program.toLowerCase();
  return matches.some((match) => normalized.includes(match.toLowerCase()));
}

function stepName(request: any, position: string) {
  return (
    request.approvalSteps?.find((step: any) => step.position === position)
      ?.reviewer?.name || ""
  );
}

export async function renderSapfDocx({ request }: { request: any }) {
  const template = await readFile(TEMPLATE_PATH);
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const sapf = request.sapf || getSapfParts(request);
  const part1 = sapf.part1;
  const part2 = sapf.part2;
  const part4 = sapf.part4 || {};
  const startAt = asDate(request.startAt);
  const endAt = asDate(request.endAt);
  const createdAt = request.createdAt ? asDate(request.createdAt) : new Date();
  const program = short(part1.program);
  const hasKnownProgram = [
    programIncludes(program, "team building"),
    programIncludes(program, "leadership summit"),
    programIncludes(program, "general assembly"),
    programIncludes(program, "competition"),
    programIncludes(program, "press conference"),
    programIncludes(program, "seminar", "convention"),
  ].some(Boolean);
  const departmentCategory = short(part1.department).toLowerCase();
  const additionalSignatoryName = (request.approvalSteps || [])
    .filter((step: any) => step.position === "ADDITIONAL_SIGNATORY")
    .map((step: any) => step.reviewer?.name)
    .filter(Boolean)
    .join(" / ");
  const deanName = stepName(request, "DEAN");
  const adviserName = stepName(request, "ADVISER");

  doc.render({
    year: schoolYear(startAt),
    schoolYear: schoolYear(startAt),
    proposalDate: format(createdAt, "MMMM d, yyyy"),
    activityTitle: part1.activityTitle,
    organization: part1.organization,
    activityTime: `${format(startAt, "h:mm a")} - ${format(endAt, "h:mm a")}`,
    activityDate: format(startAt, "MMMM d, yyyy"),
    programCourse: part1.programCourse,
    venue: part1.venue,
    department: part1.department,
    personnelInCharge: part1.personnelInCharge,
    attire: part1.attire,
    noOfParticipants: part1.noOfParticipants,
    rationale: part1.rationale,
    objectives: part1.objectives,
    programFlow: part1.programFlow,
    budget: part1.budget,
    sourceOfBudget: part1.sourceOfBudget,
    otherDetails: sapf.part3,
    otherDetailsText: sapf.part3,

    departmentCollege: marker(
      !["alternative", "graduate", "extension", "com"].some((value) =>
        departmentCategory.includes(value),
      ),
    ),
    departmentAltEd: marker(departmentCategory.includes("alternative")),
    departmentGraduate: marker(departmentCategory.includes("graduate")),
    departmentExtensions: marker(departmentCategory.includes("extension")),
    departmentCom: marker(departmentCategory.includes("com")),

    modalityFaceToFace: marker(same(part1.modality, "Face-to-face")),
    modalityOnline: marker(same(part1.modality, "Online")),
    modalityHybrid: marker(same(part1.modality, "Hybrid")),
    settingInCampus: marker(same(part1.setting, "In-Campus")),
    settingOffCampus: marker(same(part1.setting, "Off-Campus")),
    activityTypeCoCurricular: marker(same(part1.activityType, "Co-Curricular")),
    activityTypeExtraCurricular: marker(
      same(part1.activityType, "Extra-Curricular"),
    ),
    scopeOrganizational: marker(same(part1.scope, "Organizational")),
    scopeInstitutional: marker(same(part1.scope, "Institutional")),
    scopeRegional: marker(same(part1.scope, "Regional")),
    scopeNational: marker(same(part1.scope, "National")),

    programTeamBuilding: marker(programIncludes(program, "team building")),
    programLeadershipSummit: marker(
      programIncludes(program, "leadership summit"),
    ),
    programGeneralAssembly: marker(
      programIncludes(program, "general assembly"),
    ),
    programCompetition: marker(programIncludes(program, "competition")),
    programPressConference: marker(
      programIncludes(program, "press conference"),
    ),
    programSeminarConvention: marker(
      programIncludes(program, "seminar", "convention"),
    ),
    programOther: hasKnownProgram ? "" : program,

    coreCourage: marker(includes(part1.coreValues, "Courage")),
    coreCompassion: marker(includes(part1.coreValues, "Compassion")),
    coreCommunityOriented: marker(
      includes(part1.coreValues, "Community-Oriented"),
    ),
    coreHumility: marker(includes(part1.coreValues, "Humility")),
    coreInteriority: marker(includes(part1.coreValues, "Interiority")),
    coreMissionarySpirit: marker(
      includes(part1.coreValues, "Missionary Spirit"),
    ),

    egaCriticalCreative: marker(
      includes(
        part1.graduateAttributes,
        "EGA 1: Critical and Creative Thinker",
      ),
    ),
    egaCatholicProfessional: marker(
      includes(
        part1.graduateAttributes,
        "EGA 2: Competent Catholic Augustinian-Marian Professional",
      ),
    ),
    egaResponsiveSteward: marker(
      includes(part1.graduateAttributes, "EGA 3: Socially Responsive Steward"),
    ),
    egaLifelongLearner: marker(
      includes(
        part1.graduateAttributes,
        "EGA 4: Transformative Lifelong Learner",
      ),
    ),

    supportBudget: marker(includes(part2.supportRequests, "Budget")),
    budgetDetails: part2.budgetDetails,
    supportVehicle: marker(includes(part2.supportRequests, "Vehicle")),
    vehiclePassengers: part2.vehiclePassengers,
    supportFoodSnacks: marker(includes(part2.supportRequests, "Food/Snacks")),
    foodPax: part2.foodPax,
    supportRoomVenue: marker(includes(part2.supportRequests, "Room/Venue")),
    roomVenueDetails: part2.roomVenueDetails,
    supportSoundSystem: marker(includes(part2.supportRequests, "Sound System")),
    supportMicrophone: marker(includes(part2.supportRequests, "Microphone")),
    microphoneQty: part2.microphoneQty,
    supportLcdProjector: marker(
      includes(part2.supportRequests, "LCD Projector"),
    ),
    supportChairsTables: marker(
      includes(part2.supportRequests, "Chairs and Tables"),
    ),
    otherSupport: part2.otherSupport,

    parentsConsentYes: marker(positive(part4.parentsConsent)),
    parentsConsentNotApplicable: marker(negative(part4.parentsConsent)),
    attachments: part4.attachmentsForDocument || "-",
    academicInterruptionYes: marker(positive(part4.academicInterruption)),
    academicInterruptionNone: marker(negative(part4.academicInterruption)),
    academicRemarks: part4.academicInterruptionRemarks || part4.academicRemarks,
    medicalExamYes: marker(positive(part4.medicalExam)),
    medicalExamNotApplicable: marker(negative(part4.medicalExam)),
    reportComplianceYes: marker(positive(part4.reportOfCompliance)),
    reportComplianceNotApplicable: marker(negative(part4.reportOfCompliance)),
    studentPersonnelRatio: part4.studentPersonnelRatio,

    preparedBy: request.officer?.name || "",
    adviserName,
    sdsName: stepName(request, "SDS"),
    deanName,
    sasName: stepName(request, "SAS"),
    additionalSignatoryName,
    vpaaName: stepName(request, "VPAA"),
    presidentName: stepName(request, "UNIVERSITY_PRESIDENT"),
  });

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
