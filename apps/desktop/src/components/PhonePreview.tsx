import { useEffect, useRef, useState } from "react";
import type { Config } from "../types";
import type { ViewMode } from "./ViewModeToggle";

const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 820;

interface Props {
  config: Config;
  viewMode: ViewMode;
}

export default function PhonePreview({ config, viewMode }: Props) {
  const { profile, blocks, theme } = config;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    if (viewMode !== "desktop") return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / DESKTOP_WIDTH));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  const content = (
    <div className="flex flex-col items-center gap-2 px-3.5 py-6">
      {blocks
        .filter((b) => b.enabled)
        .map((block) => {
          switch (block.type) {
            case "profile":
              return (
                <div
                  key={block.id}
                  className="mb-1.5 flex flex-col items-center gap-1 text-center"
                >
                  {profile.avatarUrl ? (
                    <img
                      className="h-14 w-14 rounded-full object-cover"
                      src={profile.avatarUrl}
                      alt={profile.name}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-neutral-200" />
                  )}
                  <div className="text-[13px] font-bold">{profile.name || "이름"}</div>
                  {profile.bio && (
                    <div className="text-[10px] opacity-60">{profile.bio}</div>
                  )}
                </div>
              );
            case "link":
              return (
                <a
                  key={block.id}
                  className="block w-full rounded-md border-[1.5px] px-3 py-[9px] text-center text-[11px] font-semibold no-underline"
                  style={{ borderColor: theme.accentColor, color: theme.textColor }}
                  href={block.url}
                  onClick={(e) => e.preventDefault()}
                >
                  {block.title || "링크"}
                </a>
              );
            case "heading":
              return (
                <div
                  key={block.id}
                  className="self-start text-[9px] font-semibold uppercase tracking-[0.06em] opacity-50"
                  style={{ color: theme.textColor }}
                >
                  {block.text}
                </div>
              );
            case "text":
              return (
                <div
                  key={block.id}
                  className="text-center text-[10px] leading-[1.5] opacity-60"
                  style={{ color: theme.textColor }}
                >
                  {block.content}
                </div>
              );
          }
        })}
    </div>
  );

  const phone = (
    <div className="h-[440px] w-[220px] overflow-hidden rounded-[32px] border-[6px] border-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
      <div
        className="h-full w-full overflow-y-auto"
        data-testid="preview-surface"
        style={{ background: theme.backgroundColor, color: theme.textColor }}
      >
        {content}
      </div>
    </div>
  );

  const desktop = (
    <div ref={wrapRef} className="flex w-full justify-center">
      <div
        style={{ width: DESKTOP_WIDTH * scale, height: DESKTOP_HEIGHT * scale }}
      >
        <div
          className="overflow-hidden rounded-xl border border-neutral-300 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          style={{
            width: DESKTOP_WIDTH,
            height: DESKTOP_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="flex h-9 items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-4">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-2 flex h-6 flex-1 items-center rounded-md bg-white px-3 text-xs text-neutral-400">
              opentree.me/{profile.name || "username"}
            </div>
          </div>
          <div
            className="overflow-y-auto"
            data-testid="preview-surface"
            style={{
              height: DESKTOP_HEIGHT - 36,
              background: theme.backgroundColor,
              color: theme.textColor,
            }}
          >
            <div className="mx-auto w-[440px] max-w-full">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <aside className="flex h-full min-h-0 items-center justify-center overflow-auto bg-background p-6">
      {viewMode === "phone" ? phone : desktop}
    </aside>
  );
}
