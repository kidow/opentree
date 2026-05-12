import { Button } from "./ui/button";

interface Props {
  onOpen: () => void;
}

export default function Welcome({ onOpen }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <h1 className="welcome-title">Opentree</h1>
        <p className="welcome-desc">무료 링크인바이오 페이지를 만드세요.</p>
        <Button className="welcome-btn" onClick={onOpen}>
          프로젝트 폴더 열기
        </Button>
      </div>
      <style>{`
        .welcome {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
        }
        .welcome-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }
        .welcome-title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .welcome-desc {
          color: var(--text-muted);
        }
        .welcome-btn {
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
