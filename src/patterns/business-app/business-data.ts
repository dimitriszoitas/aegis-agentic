import type { BusinessCustomer, BusinessData, BusinessProject, TeamMember } from './business-types';

const teamSeeds = [
  ['Maya Chen', 'Admin', 'Head of client operations', 'Operations', 'San Francisco, US'],
  ['James Wilson', 'Manager', 'Delivery lead', 'Operations', 'London, UK'],
  ['Sofia Martinez', 'Manager', 'Design director', 'Design', 'Barcelona, ES'],
  ['Noah Williams', 'Member', 'Senior product designer', 'Design', 'Toronto, CA'],
  ['Aisha Patel', 'Member', 'Frontend engineer', 'Engineering', 'London, UK'],
  ['Oliver Kim', 'Manager', 'Engineering lead', 'Engineering', 'Seoul, KR'],
  ['Emma Thompson', 'Member', 'Customer success manager', 'Customer success', 'New York, US'],
  ['Lucas Silva', 'Member', 'Data analyst', 'Operations', 'Lisbon, PT'],
  ['Isabella Rossi', 'Member', 'Product designer', 'Design', 'Milan, IT'],
  ['Ethan Brooks', 'Member', 'Full-stack engineer', 'Engineering', 'Austin, US'],
  ['Amara Okafor', 'Manager', 'Customer success lead', 'Customer success', 'Berlin, DE'],
  ['Leo Martin', 'Member', 'Project coordinator', 'Operations', 'Paris, FR'],
  ['Grace Park', 'Member', 'Finance specialist', 'Finance', 'San Francisco, US'],
  ['Daniel Ahmed', 'Member', 'Backend engineer', 'Engineering', 'Amsterdam, NL'],
  ['Chloe Dubois', 'Member', 'Content strategist', 'Design', 'Paris, FR'],
  ['Mateo Garcia', 'Member', 'Implementation specialist', 'Customer success', 'Madrid, ES'],
  ['Zoe Anderson', 'Member', 'Quality engineer', 'Engineering', 'Melbourne, AU'],
  ['Arjun Mehta', 'Member', 'Operations analyst', 'Operations', 'Singapore, SG'],
] as const;

const customerSeeds = [
  ['Atlas Commerce', 'Retail', 'Claire Adams', 'New York, US', 'Enterprise', 'Active'],
  ['Meridian Health', 'Healthcare', 'Thomas Reed', 'Boston, US', 'Enterprise', 'Active'],
  ['Forma Studio', 'Design', 'Nina Laurent', 'Paris, FR', 'Business', 'Active'],
  ['Summit Logistics', 'Logistics', 'David Park', 'Chicago, US', 'Business', 'Active'],
  ['Evergreen Energy', 'Energy', 'Elena Fischer', 'Berlin, DE', 'Enterprise', 'Active'],
  ['Orbit Learning', 'Education', 'Ben Carter', 'London, UK', 'Business', 'Active'],
  ['Cedar Finance', 'Financial services', 'Priya Shah', 'Singapore, SG', 'Enterprise', 'Active'],
  ['Coastline Travel', 'Travel', 'Marco Costa', 'Lisbon, PT', 'Standard', 'Paused'],
  ['Lumen Software', 'Technology', 'Alex Rivera', 'Austin, US', 'Business', 'Active'],
  ['Fieldwork Foods', 'Food & beverage', 'Sophie Green', 'Portland, US', 'Standard', 'Active'],
  [
    'Studio North',
    'Professional services',
    'Freya Hansen',
    'Copenhagen, DK',
    'Standard',
    'Prospect',
  ],
  [
    'Bridgewater Group',
    'Professional services',
    'Michael Tan',
    'Sydney, AU',
    'Business',
    'Prospect',
  ],
] as const;

const projectNames = [
  'Customer portal redesign',
  'Patient onboarding experience',
  'Brand system rollout',
  'Delivery tracking dashboard',
  'Partner analytics workspace',
  'Learning platform launch',
  'Quarterly reporting suite',
  'Booking experience refresh',
  'Developer documentation hub',
  'Supplier onboarding flow',
  'Website discovery sprint',
  'Client workspace proposal',
  'Checkout optimization',
  'Care team scheduling',
  'Portfolio website',
  'Warehouse reporting',
  'Billing operations dashboard',
  'Course authoring tools',
  'Customer insights program',
  'Travel agent workspace',
  'Self-service billing',
  'Inventory planning tools',
  'Studio resource planning',
  'Operations discovery',
  'Loyalty program pilot',
  'Patient feedback program',
  'Design handoff library',
  'Fleet capacity planning',
  'Usage reporting automation',
  'Student progress insights',
  'Finance workflow migration',
  'Destination content library',
];

const iso = (month: number, day: number, hour = 10) =>
  new Date(Date.UTC(2026, month - 1, day, hour)).toISOString();

/** Deterministic, cross-linked sample records. Every caller gets independent mutable data. */
export function createBusinessData(): BusinessData {
  const team: TeamMember[] = teamSeeds.map(([name, role, title, department, location], index) => ({
    id: `usr-${index + 1}`,
    name,
    role,
    title,
    department,
    location,
    initials: name
      .split(' ')
      .map((part) => part[0])
      .join(''),
    email: `${name.toLowerCase().replaceAll(' ', '.')}@northstar.example`,
    status: index === 17 ? 'Invited' : index === 8 || index === 15 ? 'Away' : 'Active',
    bio: `${name.split(' ')[0]} works with client teams to turn complex requirements into clear, dependable experiences. Focused on ${department.toLowerCase()} and thoughtful collaboration.`,
    joinedAt: iso(index < 12 ? 1 + (index % 6) : 8 + (index % 3), 4 + index),
  }));
  const customers: BusinessCustomer[] = customerSeeds.map(
    ([name, industry, contact, location, plan, status], index) => ({
      id: `cus-${index + 1}`,
      name,
      industry,
      contact,
      location,
      plan,
      status,
      email: `${contact.toLowerCase().replaceAll(' ', '.')}@${name.toLowerCase().replaceAll(' ', '')}.example`,
      ownerId: ['usr-1', 'usr-7', 'usr-11'][index % 3],
      joinedAt: iso(1 + (index % 4), 5 + index),
    }),
  );
  const projects: BusinessProject[] = projectNames.map((name, index) => {
    const customer = customers[index % customers.length];
    const ownerId = ['usr-1', 'usr-2', 'usr-3', 'usr-6'][index % 4];
    const status: BusinessProject['status'] =
      customer.status === 'Prospect'
        ? 'Planned'
        : customer.status === 'Paused'
          ? 'On hold'
          : index >= 24
            ? 'Completed'
            : index % 7 === 5
              ? 'Planned'
              : 'Active';
    const progress =
      status === 'Completed'
        ? 100
        : status === 'Planned'
          ? 0
          : status === 'On hold'
            ? 40
            : [60, 80, 40, 60][index % 4];
    const memberIds = [...new Set([ownerId, `usr-${4 + (index % 7)}`, `usr-${10 + (index % 7)}`])];
    const budget = 18000 + (index % 8) * 7500;
    const taskTitles = [
      'Confirm scope and success measures',
      'Map the core customer journey',
      'Review the working prototype',
      'Complete implementation and quality review',
      'Deliver the handover and launch plan',
    ];
    return {
      id: `prj-${index + 1}`,
      name,
      customerId: customer.id,
      ownerId,
      memberIds,
      status,
      priority: index % 5 === 0 ? 'High' : index % 3 === 0 ? 'Low' : 'Medium',
      description: `Deliver ${name.toLowerCase()} for ${customer.name}. The team will align on measurable outcomes, validate the experience with stakeholders, and provide a documented handover for ongoing operations.`,
      budget,
      spent: Math.round(budget * (progress / 100) * 0.88),
      progress,
      dueDate:
        status === 'Completed'
          ? iso(10, 8 + (index % 12))
          : iso(11 + (index % 2), 3 + (index % 22)),
      updatedAt: iso(10, 24 - (index % 9), 9 - (index % 4)),
      tasks: taskTitles.map((title, taskIndex) => ({
        id: `task-${index + 1}-${taskIndex + 1}`,
        title,
        done: taskIndex < progress / 20,
        assigneeId: memberIds[taskIndex % memberIds.length],
      })),
      notes: [
        {
          id: `note-${index + 1}-1`,
          authorId: ownerId,
          text:
            status === 'Planned'
              ? 'The initial brief is ready for review. We will confirm the delivery milestones with the client at kickoff.'
              : status === 'Completed'
                ? 'Handover is complete. The client has received the final documentation and the team has archived the delivery checklist.'
                : 'The latest review is complete. Client feedback is reflected in the task list; the next checkpoint will focus on implementation readiness.',
          createdAt: iso(10, 22 - (index % 7), 14),
        },
      ],
    };
  });
  const billable = projects.filter(
    (project) =>
      customers.find((customer) => customer.id === project.customerId)?.status !== 'Prospect',
  );
  const invoices: BusinessData['invoices'] = Array.from({ length: 24 }, (_, index) => {
    const project = billable[index % billable.length];
    const month = 5 + Math.floor(index / 4);
    const status = index >= 22 ? 'Pending' : index % 7 === 0 || index === 20 ? 'Overdue' : 'Paid';
    return {
      id: `INV-2026-${String(index + 1).padStart(3, '0')}`,
      customerId: project.customerId,
      projectId: project.id,
      amount: 2500 + (index % 9) * 1750,
      status,
      issuedAt: iso(month, 2 + (index % 4) * 3),
      dueDate: status === 'Pending' ? iso(11, 8 + (index % 4)) : iso(month, 16 + (index % 4) * 3),
    };
  });
  const activity: BusinessData['activity'] = [
    {
      actorId: 'usr-1',
      text: 'Updated the delivery plan for Customer portal redesign.',
      page: 'projects',
      recordId: 'prj-1',
    },
    {
      actorId: 'usr-13',
      text: 'Recorded the latest payment from Meridian Health.',
      page: 'customers',
      recordId: 'cus-2',
    },
    {
      actorId: 'usr-3',
      text: 'Shared the next design review for Brand system rollout.',
      page: 'projects',
      recordId: 'prj-3',
    },
    {
      actorId: 'usr-7',
      text: 'Reviewed the account plan for Summit Logistics.',
      page: 'customers',
      recordId: 'cus-4',
    },
    {
      actorId: 'usr-6',
      text: 'Completed the delivery checklist for Loyalty program pilot.',
      page: 'projects',
      recordId: 'prj-25',
    },
    {
      actorId: 'usr-11',
      text: 'Added the discovery brief for Studio North.',
      page: 'customers',
      recordId: 'cus-11',
    },
    {
      actorId: 'usr-2',
      text: 'Updated the milestones for Patient onboarding experience.',
      page: 'projects',
      recordId: 'prj-2',
    },
    {
      actorId: 'usr-5',
      text: 'Completed the prototype review for Partner analytics workspace.',
      page: 'projects',
      recordId: 'prj-5',
    },
    {
      actorId: 'usr-1',
      text: 'Invited Arjun Mehta to the Operations team.',
      page: 'team',
      recordId: 'usr-18',
    },
    {
      actorId: 'usr-12',
      text: 'Confirmed the next checkpoint for Delivery tracking dashboard.',
      page: 'projects',
      recordId: 'prj-4',
    },
    {
      actorId: 'usr-3',
      text: 'Updated the Design team profile for Isabella Rossi.',
      page: 'team',
      recordId: 'usr-9',
    },
    {
      actorId: 'usr-11',
      text: 'Prepared the next account review for Cedar Finance.',
      page: 'customers',
      recordId: 'cus-7',
    },
  ].map((event, index) => ({
    ...event,
    page: event.page as 'projects' | 'customers' | 'team',
    id: `act-${index + 1}`,
    date: new Date(Date.parse(iso(10, 24, 9)) - index * 3_600_000).toISOString(),
  }));
  return { projects, customers, invoices, team, activity };
}
