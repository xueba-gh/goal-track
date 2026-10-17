import { addDays, uid } from './dates';
import type { AppData, Goal, PlanItem } from './types';

const NOW = '2026-10-17T17:00';

export const CGRC_ID = 'goal-cgrc';
export const CGRC_EXAM = '2027-01-29T09:00';

const emptySmart = { specific: '', measurable: '', achievable: '', relevant: '', timeBound: '' };

type Slot = [dayOffset: number, time: string, title: string, minutes: number, kind?: PlanItem['kind'], detail?: string];

interface Week {
  monday: string;
  focus: string;
  slots: Slot[];
}

const ev = '19:00';
const sat = '09:00';

/**
 * CGRC retake plan. Domain weights follow the ISC2 outline in effect since 15 June 2024:
 * D1 16%, D2 10%, D3 14%, D4 17%, D5 16%, D6 14%, D7 13%. The domains follow the NIST RMF in order.
 */
const CGRC_WEEKS: Week[] = [
  {
    monday: '2026-10-19',
    focus: 'Restart at recovery pace',
    slots: [
      [1, ev, 'Read your last score report and rank your weakest domains', 45],
      [3, ev, 'Read the CGRC outline end to end and map each domain to an RMF step', 45],
      [5, sat, 'Diagnostic: 50 practice questions, untimed', 90, 'milestone', 'Note the domain of every miss. This sets your starting baseline.'],
    ],
  },
  {
    monday: '2026-10-26',
    focus: 'Domain 1 · Governance, risk & compliance program (16%)',
    slots: [
      [0, ev, 'Risk program basics: strategy, risk tolerance, governance', 90],
      [2, ev, 'Roles: AO, system owner, ISSO, CISO, assessor, privacy officer', 90],
      [4, ev, 'RMF Prepare step (SP 800-37) at org and system level', 90],
      [5, sat, '60 Domain 1 questions + review every miss', 120],
    ],
  },
  {
    monday: '2026-11-02',
    focus: 'Domain 1 · frameworks and privacy',
    slots: [
      [0, ev, 'Frameworks side by side: NIST RMF, CSF, ISO 27001/27005', 90],
      [2, ev, 'Privacy and regulation: GDPR, FISMA, HIPAA, PCI DSS, CMMC', 90],
      [4, ev, 'Domain 1 flashcard pass + weak-spot notes', 60],
      [5, sat, 'Domain 1 checkpoint: 40 questions, timed', 90, 'milestone'],
    ],
  },
  {
    monday: '2026-11-09',
    focus: 'Domain 2 · Scope of the system (10%)',
    slots: [
      [0, ev, 'System description and authorization boundary', 90],
      [2, ev, 'Security categorization: FIPS 199 and SP 800-60', 90],
      [4, ev, 'Information types, data flows, privacy impact', 90],
      [5, sat, '50 Domain 2 questions + review', 120],
    ],
  },
  {
    monday: '2026-11-16',
    focus: 'Domain 3 · Selecting and approving controls (14%)',
    slots: [
      [0, ev, 'Control baselines (SP 800-53B)', 90],
      [2, ev, 'Tailoring, overlays, common vs system-specific controls', 90],
      [4, ev, 'Security and privacy plans: contents and approval', 90],
      [5, sat, '60 Domain 3 questions + review', 120],
    ],
  },
  {
    monday: '2026-11-23',
    focus: 'Domain 4 · Implementing controls (17%)',
    slots: [
      [0, ev, 'Implementing controls and documenting the implementation', 90],
      [2, ev, 'Inherited and common controls, control providers', 90],
      [4, ev, 'Configuration baselines and supply-chain controls', 90],
      [5, sat, '50 Domain 4 questions + review', 120],
    ],
  },
  {
    monday: '2026-11-30',
    focus: 'Domain 4 wrap-up + first mock',
    slots: [
      [0, ev, 'Domain 4 weak-spot review', 90],
      [2, ev, 'Flashcards: Domains 1–4', 60],
      [5, sat, 'Mock exam #1 · half length (63 questions, 90 min)', 120, 'milestone', 'Score it by domain and write down the three topics that cost you most.'],
    ],
  },
  {
    monday: '2026-12-07',
    focus: 'Domain 5 · Assessment and audit (16%)',
    slots: [
      [0, ev, 'Assessment planning: SP 800-53A and the assessment plan', 90],
      [2, ev, 'Assessment methods: examine, interview, test', 90],
      [4, ev, 'Assessment report, POA&M, remediation', 90],
      [5, sat, '60 Domain 5 questions + review', 120],
    ],
  },
  {
    monday: '2026-12-14',
    focus: 'Domain 6 · System compliance (14%)',
    slots: [
      [0, ev, 'Authorization package: what goes in and who signs', 90],
      [2, ev, 'Risk determination and AO decisions: ATO, IATT, denial', 90],
      [4, ev, 'Risk acceptance, reciprocity, common authorizations', 90],
      [5, sat, '50 Domain 6 questions + review', 120],
    ],
  },
  {
    monday: '2026-12-21',
    focus: 'Domain 7 · Compliance maintenance (13%), Christmas week',
    slots: [
      [0, ev, 'Continuous monitoring strategy (SP 800-137)', 90],
      [2, ev, 'Change management and security impact analysis', 60],
      [5, sat, 'Ongoing authorization, reporting, decommissioning + 40 Domain 7 questions', 120],
    ],
  },
  {
    monday: '2026-12-28',
    focus: 'Weak domains + first full mock',
    slots: [
      [0, ev, 'Review mock #1 misses by domain', 90],
      [2, ev, 'Deep dive: your weakest domain', 90],
      [5, sat, 'Mock exam #2 · full length (125 questions, 3 hours)', 180, 'milestone'],
    ],
  },
  {
    monday: '2027-01-04',
    focus: 'RMF end to end',
    slots: [
      [0, ev, 'Mock #2 review: for every miss, why the right answer wins', 90],
      [2, ev, 'Walk the RMF from Prepare to Monitor without notes', 90],
      [4, ev, 'Deep dive: your second-weakest domain', 90],
      [5, sat, 'Mock exam #3 · full length', 180, 'milestone'],
    ],
  },
  {
    monday: '2027-01-11',
    focus: 'Scenario judgement',
    slots: [
      [0, ev, 'Mock #3 review', 90],
      [2, ev, 'Scenario drills: "what should the AO / ISSO do FIRST?"', 90],
      [4, ev, 'Flashcards: all seven domains', 60],
      [5, sat, 'Mock exam #4 · full length', 180, 'milestone'],
    ],
  },
  {
    monday: '2027-01-18',
    focus: 'Final pass',
    slots: [
      [0, ev, 'Mock #4 review', 90],
      [2, ev, 'Final pass: Domains 1–3', 90],
      [4, ev, 'Final pass: Domains 4–7', 90],
      [5, sat, 'Final mock #5 · full length, real exam conditions', 180, 'milestone'],
    ],
  },
  {
    monday: '2027-01-25',
    focus: 'Taper and exam logistics',
    slots: [
      [0, ev, 'Mock #5 review, light', 60],
      [1, ev, 'Flashcards only, 45 minutes', 45],
      [2, '18:00', 'Logistics: confirm the Pearson VUE booking, ID, route and start time', 30, 'task'],
      [3, '18:00', 'Rest day. No new material.', 15, 'task'],
    ],
  },
];

function cgrcItems(): PlanItem[] {
  const items: PlanItem[] = [];
  for (const w of CGRC_WEEKS) {
    for (const [offset, time, title, minutes, kind = 'session', detail] of w.slots) {
      items.push({
        id: uid(),
        goalId: CGRC_ID,
        title,
        detail: detail ?? w.focus,
        date: `${addDays(w.monday, offset)}T${time}`,
        durationMin: minutes,
        kind,
        done: false,
        remindMin: 30,
      });
    }
  }
  items.push({
    id: uid(),
    goalId: CGRC_ID,
    title: 'CGRC exam',
    detail: 'Pearson VUE. 125 questions, 3 hours, 700/1000 to pass. Edit the time if your booking differs.',
    date: CGRC_EXAM,
    durationMin: 180,
    kind: 'deadline',
    done: false,
    remindMin: 1440,
  });
  return items;
}

const goals: Goal[] = [
  {
    id: CGRC_ID,
    title: 'Pass the CGRC retake',
    area: 'Certifications',
    status: 'active',
    color: '#1f4e8c',
    deadline: CGRC_EXAM,
    link: '',
    linkLabel: 'Practice site',
    why: 'A GRC credential that opens the next step in my security career.',
    smart: {
      specific: 'Pass the ISC2 CGRC exam on the retake.',
      measurable: 'Score 700+ out of 1000. Score 80%+ on my last two full mocks.',
      achievable: 'Four sessions a week: Mon, Wed, Fri evenings and a Saturday morning block. Lighter pace while I recover.',
      relevant: 'Builds my GRC career and clears the way for CEH.',
      timeBound: 'Exam on Friday, 29 January 2027.',
    },
    createdAt: NOW,
  },
  {
    id: 'goal-ceh',
    title: 'Prepare for the CEH (Ethical Hacking) exam',
    area: 'Certifications',
    status: 'next',
    color: '#2a8c82',
    why: 'Planned after the CGRC is done.',
    smart: { ...emptySmart, timeBound: 'Plan the schedule the week after the CGRC.' },
    createdAt: NOW,
  },
  {
    id: 'goal-youtube',
    title: 'Revive the YouTube channels',
    area: 'Content',
    status: 'later',
    color: '#b4505a',
    why: 'Focus channels: Readers Mind, Psychagogy, Pneuma, Only Geniuses. Plus mature Christian videos, and a web blog for each channel.',
    smart: { ...emptySmart },
    createdAt: NOW,
  },
  {
    id: 'goal-readersmind-site',
    title: 'Build the Readersmind website',
    area: 'Content',
    status: 'later',
    color: '#6c5fa7',
    smart: { ...emptySmart },
    createdAt: NOW,
  },
  {
    id: 'goal-products',
    title: 'Sell digital products: PDFs, Excel sheets, books',
    area: 'Products',
    status: 'later',
    color: '#4c8c4a',
    smart: { ...emptySmart },
    createdAt: NOW,
  },
  {
    id: 'goal-apps',
    title: 'Build apps: student budget, ADHD, pet, homekeeper',
    area: 'Apps',
    status: 'later',
    color: '#c08a2e',
    why: 'Ship one small version before starting the next.',
    smart: { ...emptySmart },
    createdAt: NOW,
  },
  {
    id: 'goal-holdings',
    title: 'Build companies and holdings',
    area: 'Long game',
    status: 'later',
    color: '#6b7280',
    why: 'The result of the other goals compounding.',
    smart: { ...emptySmart },
    createdAt: NOW,
  },
];

export function makeSeed(): AppData {
  return {
    version: 1,
    goals,
    items: [
      ...cgrcItems(),
      {
        id: uid(),
        goalId: 'goal-ceh',
        title: 'Plan the CEH study schedule',
        detail: 'Pick an exam date and build the weekly plan, the same way as the CGRC.',
        date: '2027-02-01T19:00',
        durationMin: 60,
        kind: 'task',
        done: false,
        remindMin: 60,
      },
    ],
    notes: [],
    wins: [],
    settings: {
      notifications: false,
      voiceLang: typeof navigator !== 'undefined' ? navigator.language || 'en-GB' : 'en-GB',
      focusGoalId: CGRC_ID,
      autoLockMin: 30,
    },
  };
}
