const SECTIONS = [
  {
    title: 'The service',
    body: `Let's Go connects people who want to take part in the same real-world activities. You can discover public activities, join rooms, vote on schedules, chat with members and build recurring communities.`,
  },
  {
    title: 'Your commitments',
    body: `You must be at least 13 years old (or the age of digital consent in your country) to use Let's Go. You agree to provide accurate account information, to attend activities you have confirmed where reasonably possible, to cancel in advance when you can't, and to treat hosts and members with respect.

Hosts set house rules and cancellation policies for their rooms — joining a room means you agree to follow them.`,
  },
  {
    title: 'Prohibited conduct',
    body: `You may not use Let's Go for anything illegal, harmful or deceptive: harassment, hate speech, scams, spam, impersonation, sharing others' private information, or organizing unsafe or fraudulent activities. Commercial activity in rooms is only allowed when clearly disclosed by the host.`,
  },
  {
    title: 'Content & moderation',
    body: `You keep ownership of content you post. You grant us a limited license to display it within the service as intended. We may remove content or suspend accounts that violate these terms or our safety guidelines. Moderation actions are recorded in an audit log.`,
  },
  {
    title: 'Liability',
    body: `Let's Go facilitates connections; activities themselves are organized by their hosts. Participating in real-world activities carries ordinary risks — use good judgment, meet in public places, and tell someone where you're going. To the maximum extent permitted by law, the service is provided "as is" and we are not liable for disputes, injuries or losses arising from activities organized through it.`,
  },
  {
    title: 'Changes',
    body: `We may update these terms as the product evolves. Continued use after changes means you accept the updated terms.`,
  },
];

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Terms of Service</h1>
      <p className="text-sm text-ink-soft mt-1">Last updated: October 2026</p>
      <div className="mt-5 space-y-5">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-extrabold text-ink">{s.title}</h2>
            <p className="text-sm text-ink-soft mt-1.5 whitespace-pre-line">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
