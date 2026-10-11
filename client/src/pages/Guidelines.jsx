const SECTIONS = [
  {
    title: 'Meet in public first',
    body: `Choose public, well-lit venues for first meetups — parks, grounds, cafés, courts. Avoid sharing your home address until you genuinely trust the group.`,
  },
  {
    title: "Check who you're meeting",
    body: `Look at the host's profile: how long they've been a member, what they've hosted, and whether their email is verified. Ask questions in the room chat before you commit.`,
  },
  {
    title: 'Keep payments sensible',
    body: `Small shared costs (court fees, snacks) are normal. Be cautious of anyone asking for large upfront payments, deposits to personal accounts, or gift cards — that's a scam pattern.`,
  },
  {
    title: 'Use the tools',
    body: `Every profile and message can be blocked or reported. Blocking stops someone from messaging you and hides your activity in shared rooms. Reports go to our moderation team and are handled with a full audit trail.`,
  },
  {
    title: 'Hosts: set expectations',
    body: `Write clear house rules and a cancellation policy when you create a room. Confirm schedules in advance, and use the attendance tools so members know whether joining is a commitment or just interest.`,
  },
  {
    title: 'No-show policy',
    body: `Life happens — cancel early when plans change so waitlisted members can take your spot. Repeated unexplained no-shows may be flagged by hosts. You can always contact support to dispute an attendance record you believe is wrong.`,
  },
];

export default function Guidelines() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Safety guidelines</h1>
      <p className="text-sm text-ink-soft mt-1">
        Let&rsquo;s Go works best when everyone feels safe. A few habits make every meetup better.
      </p>
      <div className="mt-5 space-y-5">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-extrabold text-ink">{s.title}</h2>
            <p className="text-sm text-ink-soft mt-1.5 whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        See something wrong? Report it in the app or email <a className="text-primary font-semibold" href="mailto:support@letsgo.app">support@letsgo.app</a>.
      </p>
    </div>
  );
}
