import type { Config } from "../types";

interface Props {
  config: Config;
}

export default function PhonePreview({ config }: Props) {
  const { profile, blocks, theme } = config;

  return (
    <aside className="preview-panel">
      <div className="phone-frame">
        <div
          className="phone-screen"
          style={{ background: theme.backgroundColor, color: theme.textColor }}
        >
          <div className="phone-content">
            {blocks
              .filter((b) => b.enabled)
              .map((block) => {
                switch (block.type) {
                  case "profile":
                    return (
                      <div key={block.id} className="preview-profile">
                        {profile.avatarUrl ? (
                          <img className="preview-avatar" src={profile.avatarUrl} alt={profile.name} />
                        ) : (
                          <div className="preview-avatar-placeholder" />
                        )}
                        <div className="preview-name">{profile.name || "이름"}</div>
                        {profile.bio && <div className="preview-bio">{profile.bio}</div>}
                      </div>
                    );
                  case "link":
                    return (
                      <a
                        key={block.id}
                        className="preview-link"
                        style={{ borderColor: theme.accentColor, color: theme.textColor }}
                        href={block.url}
                        onClick={(e) => e.preventDefault()}
                      >
                        {block.title || "링크"}
                      </a>
                    );
                  case "heading":
                    return (
                      <div key={block.id} className="preview-heading" style={{ color: theme.textColor }}>
                        {block.text}
                      </div>
                    );
                  case "text":
                    return (
                      <div key={block.id} className="preview-text" style={{ color: theme.textColor }}>
                        {block.content}
                      </div>
                    );
                }
              })}
          </div>
        </div>
      </div>
      <style>{`
        .preview-panel {
          height: 100%;
          min-height: 0;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .phone-frame {
          width: 220px;
          height: 440px;
          border-radius: 32px;
          border: 6px solid #1a1a1a;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .phone-screen {
          width: 100%;
          height: 100%;
          overflow-y: auto;
        }
        .phone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px 14px;
        }
        .preview-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          text-align: center;
        }
        .preview-avatar {
          width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
        }
        .preview-avatar-placeholder {
          width: 56px; height: 56px; border-radius: 50%; background: #e5e5e5;
        }
        .preview-name { font-size: 13px; font-weight: 700; }
        .preview-bio { font-size: 10px; opacity: 0.6; }
        .preview-link {
          display: block; width: 100%; padding: 9px 12px;
          border: 1.5px solid; border-radius: 6px;
          font-size: 11px; font-weight: 600; text-align: center;
          text-decoration: none;
        }
        .preview-heading {
          font-size: 9px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; opacity: 0.5; align-self: flex-start;
        }
        .preview-text {
          font-size: 10px; opacity: 0.6; text-align: center; line-height: 1.5;
        }
      `}</style>
    </aside>
  );
}
