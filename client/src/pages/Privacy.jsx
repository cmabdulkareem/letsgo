const SECTIONS = [
  {
    title: 'What we collect',
    body: `We collect the details you give us when you create an account (name, username, email, city), the content you create (activities, communities, messages, profile details), and basic technical data needed to run the service (device type, rough location you choose to share for activity discovery).

We use browser geolocation only when you explicitly allow it, only to show distances to activities, and we never track you in the background.`,
  },
  {
    title: 'What we never do',
    body: `We never sell your personal data. We never publish your exact home location — activities show a meeting point you choose. We never expose your email address or password hash to other users. Private room content is never shown to non-members, and sharing a private room link does not grant access.`,
  },
  {
    title: 'Authentication & security',
    body: `Passwords are stored only as strong hashes. Sessions use short-lived access tokens and rotating refresh tokens held in HttpOnly cookies — never in localStorage where scripts could read them. Our service worker never caches private API responses, messages or tokens.`,
  },
  {
    title: 'Your controls',
    body: `In Settings you can make your profile public or members-only, hide your activity history and attendance summary, choose notification channels, block other users, export your data by contacting support, and deactivate your account at any time.`,
  },
  {
    title: 'Contact',
    body: `Questions or data requests: support@letsgo.app.`,
  },
];

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Privacy Policy</h1>
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
