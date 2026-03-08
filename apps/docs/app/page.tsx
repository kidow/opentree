import Link from "next/link";

const workflow = [
  {
    step: "01",
    title: "init",
    description: "Create the starter config with sensible defaults and schemaVersion: 1."
  },
  {
    step: "02",
    title: "edit",
    description:
      "Update profile, theme, metadata, and links from focused commands instead of hand-editing JSON."
  },
  {
    step: "03",
    title: "build",
    description:
      "Generate index.html, favicon.svg, opengraph-image.svg, and site files such as robots.txt when siteUrl exists."
  },
  {
    step: "04",
    title: "deploy",
    description:
      "Validate, link with Vercel, and push preview or production builds without losing the CLI workflow."
  }
];

const proofPoints = [
  "Single config contract with JSON schema and deterministic CLI edits",
  "Static output that stays deployable outside a custom runtime",
  "Built-in Vercel readiness checks through doctor, link, status, and deploy",
  "Machine-readable --json output for scripting and CI automation"
];

const workflowLine = "init -> edit -> build -> deploy";

const commandPreview = [
  "opentree init --name \"Kidow\" --bio \"CLI-first profile\"",
  "opentree link add --title \"Docs\" --url \"https://example.com/docs\"",
  "opentree build",
  "opentree dev"
].join("\n");

const configPreview = `{
  "schemaVersion": 1,
  "profile": {
    "name": "Kidow",
    "bio": "CLI-first profile",
    "avatarUrl": ""
  },
  "links": [
    {
      "title": "Docs",
      "url": "https://example.com/docs"
    }
  ],
  "template": "terminal",
  "analytics": {
    "clickTracking": "local"
  }
}`;

export default function HomePage() {
  return (
    <main className="ot-shell">
      <section className="ot-hero">
        <div className="ot-hero-copy">
          <p className="ot-eyebrow">CLI-first link-in-bio generator</p>
          <h1>Documentation for operators who want the shortest path to a live page.</h1>
          <p className="ot-lead">
            opentree is not a dashboard. It is a config-driven CLI that takes you from install to
            init, edit, build, and deploy with a small set of precise commands.
          </p>
          <div className="ot-actions">
            <Link className="ot-button ot-button-primary" href="/docs/getting-started/quick-start">
              5-minute quick start
            </Link>
            <Link className="ot-button" href="/docs/reference/config-schema">
              View config schema
            </Link>
            <a className="ot-button" href="https://github.com/kidow/opentree">
              GitHub
            </a>
          </div>
          <p className="ot-caption">Workflow: {workflowLine}</p>
        </div>

        <div className="ot-command-card">
          <div className="ot-command-header">
            <span>operator log</span>
            <span>safe defaults</span>
          </div>
          <pre>
            <code>{commandPreview}</code>
          </pre>
        </div>
      </section>

      <section className="ot-grid-section">
        <div>
          <p className="ot-section-label">How it works</p>
          <h2>The docs follow the real CLI flow instead of feature marketing.</h2>
        </div>
        <div className="ot-workflow-grid">
          {workflow.map((item) => (
            <article className="ot-panel" key={item.step}>
              <span className="ot-step">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ot-split-section">
        <article className="ot-panel">
          <p className="ot-section-label">Why opentree</p>
          <ul className="ot-proof-list">
            {proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <article className="ot-panel ot-preview-panel">
          <div>
            <p className="ot-section-label">Template preview</p>
            <h3>glass and terminal ship with different operating moods.</h3>
          </div>
          <div className="ot-template-grid">
            <div className="ot-template ot-template-glass">
              <span>glass</span>
              <strong>Soft gradients, layered cards, social-card polish.</strong>
            </div>
            <div className="ot-template ot-template-terminal">
              <span>terminal</span>
              <strong>Dense contrast, monospaced chrome, utilitarian framing.</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="ot-split-section">
        <article className="ot-panel">
          <p className="ot-section-label">Example config</p>
          <pre>
            <code>{configPreview}</code>
          </pre>
        </article>

        <article className="ot-panel">
          <p className="ot-section-label">Start reading</p>
          <div className="ot-link-stack">
            <Link href="/docs">Open the docs index</Link>
            <Link href="/docs/getting-started/installation">Install and environment checks</Link>
            <Link href="/docs/guides/preview-and-build">Preview, build outputs, and generated assets</Link>
            <Link href="/docs/guides/deploy-to-vercel">Vercel deploy preflight and production rollout</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
