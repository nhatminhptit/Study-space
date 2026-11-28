import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router";
import CopyButton from "../../components/CopyButton";
import type { Room } from "../../services/rooms";
import MindmapPanel from "../mindmap/MindmapPanel";
import WhiteboardPanel from "../whiteboard/WhiteboardPanel";
import MusicPanel from "../music/MusicPanel";
import ChatPanel from "../chat/ChatPanel";
import { useRoomPresence } from "../chat/useRoomPresence";
import MembersPanel from "./MembersPanel";
import "./room.css";

type MainTab = "whiteboard" | "mindmap" | "flashcard";
type SideTab = "chat" | "members" | "music";

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "whiteboard", label: "Bảng trắng" },
  { id: "mindmap", label: "Sơ đồ tư duy" },
  { id: "flashcard", label: "Flashcard" },
];

function Placeholder({ title }: { title: string }) {
  return <div className="placeholder">{title} – đang phát triển</div>;
}

/*
 * Khung khong gian hoc cua 1 phong: header phong, vung lam viec (tab) va sidebar.
 * Cac task sau gan component that vao: bang trang, mindmap, flashcard, chat.
 */
export default function RoomWorkspace({ room }: { room: Room }) {
  const [tab, setTab] = useState<MainTab>("whiteboard");
  // giu cac tab da mo de khong mat trang thai khi chuyen tab
  const [visited, setVisited] = useState<Set<MainTab>>(
    () => new Set(["whiteboard"]),
  );
  const [sideTab, setSideTab] = useState<SideTab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const presence = useRoomPresence(room.id);
  const [unread, setUnread] = useState(0);
  const chatVisible = sidebarOpen && sideTab === "chat";

  // dem tin moi den khi khung chat dang an
  const onIncoming = useCallback(() => {
    if (!chatVisible) setUnread((n) => n + 1);
  }, [chatVisible]);

  function openTab(next: MainTab) {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }

  function showSide(next: SideTab) {
    setSideTab(next);
    setSidebarOpen(true);
    if (next === "chat") setUnread(0);
  }

  const panels: Record<MainTab, ReactNode> = {
    whiteboard: <WhiteboardPanel roomId={room.id} />,
    mindmap: <MindmapPanel />,
    flashcard: <Placeholder title="Flashcard" />,
  };

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-title">
          <Link
            to="/rooms"
            className="button ghost back"
            aria-label="Về danh sách phòng"
          >
            ←
          </Link>
          <h2 title={room.name}>{room.name}</h2>
          <span className="room-code">
            {room.code}
            <CopyButton text={room.code} label="Sao chép mã phòng" />
          </span>
        </div>

        <div className="room-header-right">
          <button
            type="button"
            className={sidebarOpen && sideTab === "music" ? "primary" : ""}
            onClick={() =>
              sidebarOpen && sideTab === "music"
                ? setSidebarOpen(false)
                : showSide("music")
            }
          >
            Nhạc
          </button>
          <button
            type="button"
            className={sidebarOpen && sideTab !== "music" ? "primary" : ""}
            onClick={() =>
              sidebarOpen && sideTab !== "music"
                ? setSidebarOpen(false)
                : showSide("chat")
            }
            aria-pressed={sidebarOpen}
          >
            Chat
            {unread > 0 && <span className="unread-badge">{unread}</span>}
          </button>
        </div>
      </header>

      <nav className="room-tabs" role="tablist">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`room-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => openTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="room-body">
        <section className="room-stage">
          {MAIN_TABS.filter((t) => visited.has(t.id)).map((t) => (
            <div key={t.id} className="room-panel" hidden={tab !== t.id}>
              {panels[t.id]}
            </div>
          ))}
        </section>

        <aside className="room-sidebar" hidden={!sidebarOpen}>
          <div className="side-tabs">
            <button
              type="button"
              className={`room-tab ${sideTab === "chat" ? "active" : ""}`}
              onClick={() => showSide("chat")}
            >
              Chat
              {unread > 0 && <span className="unread-badge">{unread}</span>}
            </button>
            <button
              type="button"
              className={`room-tab ${sideTab === "music" ? "active" : ""}`}
              onClick={() => showSide("music")}
            >
              Nhạc
            </button>
            <button
              type="button"
              className={`room-tab ${sideTab === "members" ? "active" : ""}`}
              onClick={() => showSide("members")}
            >
              Thành viên
              {presence.users.length > 0 && (
                <span className="online-badge">{presence.users.length}</span>
              )}
            </button>
            <button
              type="button"
              className="ghost close-sidebar"
              aria-label="Đóng"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="side-content">
            <div className="side-panel" hidden={sideTab !== "chat"}>
              <ChatPanel
                roomId={room.id}
                online={presence.users}
                connected={presence.connected}
                active={chatVisible}
                onIncoming={onIncoming}
              />
            </div>
            <div className="side-panel" hidden={sideTab !== "members"}>
              <MembersPanel room={room} online={presence.users} />
            </div>
            <div className="side-panel" hidden={sideTab !== "music"}>
              <MusicPanel roomId={room.id} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
