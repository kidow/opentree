import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { useAppStore } from "../store";
import type { Block } from "../types";
import BlockCard from "./BlockCard";
import AddBlockModal from "./AddBlockModal";
import ImportModal from "./ImportModal";

interface ImportedLink { title: string; url: string; }

interface Props {
  store: ReturnType<typeof useAppStore>;
}

function newId() { return crypto.randomUUID(); }

export default function Editor({ store }: Props) {
  const [adding, setAdding] = useState(false);
  const [importLinks, setImportLinks] = useState<ImportedLink[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const { config } = store;
  if (!config) return null;

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = config.blocks.findIndex((b) => b.id === active.id);
    const newIndex = config.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    if (config.blocks[oldIndex].type === "profile") return;
    if (config.blocks[newIndex].type === "profile") return;
    store.reorderBlocks(arrayMove(config.blocks, oldIndex, newIndex));
  };

  const handleImportClick = useCallback(async () => {
    setImportError(null);
    const file = await open({
      multiple: false,
      title: "JSON 파일 선택",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!file || typeof file !== "string") return;
    try {
      const links: ImportedLink[] = await invoke("parse_import_file", { filePath: file });
      setImportLinks(links);
    } catch (e) {
      setImportError(String(e));
    }
  }, []);

  const handleImportAppend = useCallback(() => {
    if (!importLinks) return;
    const newBlocks: Block[] = importLinks.map((l) => ({
      id: newId(), type: "link", enabled: true, title: l.title, url: l.url,
    }));
    newBlocks.forEach((b) => store.addBlock(b));
    setImportLinks(null);
  }, [importLinks, store]);

  const handleImportReplace = useCallback(() => {
    if (!importLinks) return;
    const kept = config.blocks.filter((b) => b.type !== "link");
    const newBlocks: Block[] = importLinks.map((l) => ({
      id: newId(), type: "link", enabled: true, title: l.title, url: l.url,
    }));
    store.update({ ...config, blocks: [...kept, ...newBlocks] });
    setImportLinks(null);
  }, [importLinks, config, store]);

  return (
    <main className="editor">
      <div className="editor-header">
        <h2 className="editor-title">Links</h2>
        <div className="editor-header-actions">
          <button className="import-btn" onClick={handleImportClick}>
            가져오기
          </button>
          <button className="add-btn" onClick={() => setAdding(true)}>
            + 추가
          </button>
        </div>
      </div>
      {importError && (
        <div className="import-error">⚠ {importError}</div>
      )}
      <div className="editor-blocks">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={config.blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {config.blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                profile={config.profile}
                onUpdate={(patch) => store.updateBlock(block.id, patch)}
                onRemove={
                  block.type !== "profile"
                    ? () => store.removeBlock(block.id)
                    : undefined
                }
                onToggle={() =>
                  store.updateBlock(block.id, { enabled: !block.enabled })
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {adding && (
        <AddBlockModal
          onAdd={(block: Block) => { store.addBlock(block); setAdding(false); }}
          onClose={() => setAdding(false)}
        />
      )}
      {importLinks && (
        <ImportModal
          links={importLinks}
          onAppend={handleImportAppend}
          onReplace={handleImportReplace}
          onClose={() => setImportLinks(null)}
        />
      )}
      <style>{`
        .editor {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
        }
        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .editor-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .editor-header-actions { display: flex; gap: 8px; }
        .import-btn {
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-weight: 500;
          font-size: 13px;
          color: var(--text);
        }
        .import-btn:hover { background: var(--bg); }
        .add-btn {
          padding: 8px 16px;
          background: var(--accent);
          color: white;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
        }
        .add-btn:hover { opacity: 0.8; }
        .import-error {
          padding: 10px 24px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 13px;
          border-bottom: 1px solid #fecaca;
        }
        .editor-blocks {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </main>
  );
}
