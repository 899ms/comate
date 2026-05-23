import { useState } from "react";
import { CalendarDays, ChevronDown, Clock3, Image as ImageIcon, MessageSquareText } from "lucide-react";

import type { CapabilitySummary, DatePreset, PromptState, SessionFacet } from "../../shared/types.js";
import { getCapabilityMenuCount } from "../domain/capabilityView.js";
import {
  CAPABILITY_MENU_ITEMS,
  GLOBAL_MODULES,
  type AppModule,
  type CapabilitySection
} from "../domain/navigation.js";

const comateIconUrl = new URL("../../../assets/comate-icon.svg", import.meta.url).href;

interface SidebarProps {
  activeModule: AppModule;
  capabilitySection: CapabilitySection;
  capabilitySummary: CapabilitySummary | null;
  collapsed: boolean;
  datePreset: DatePreset;
  imageTotal: number;
  loading: boolean;
  promptState: PromptState;
  sessionId: string | undefined;
  sessions: SessionFacet[];
  onActiveModuleChange: (value: AppModule) => void;
  onCapabilitySectionChange: (value: CapabilitySection) => void;
  onDatePresetChange: (value: DatePreset) => void;
  onPromptStateChange: (value: PromptState) => void;
  onSessionChange: (value: string | undefined) => void;
}

const DATE_FILTERS: Array<{ label: string; value: DatePreset }> = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" }
];

export function Sidebar({
  activeModule,
  capabilitySection,
  capabilitySummary,
  collapsed,
  datePreset,
  imageTotal,
  loading,
  promptState,
  sessionId,
  sessions,
  onActiveModuleChange,
  onCapabilitySectionChange,
  onDatePresetChange,
  onPromptStateChange,
  onSessionChange
}: SidebarProps) {
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const handleDatePresetChange = (value: DatePreset) => {
    onDatePresetChange(value);

    if (value === "all") {
      onSessionChange(undefined);
    }
  };
  const isDateFilterActive = (value: DatePreset) => {
    return value === "all" ? datePreset === "all" && !sessionId : datePreset === value;
  };

  if (collapsed) {
    return (
      <aside className="sidebar collapsed" aria-label="CoMate navigation">
        <div className="rail-brand" title="CoMate">
          <img src={comateIconUrl} alt="CoMate" />
        </div>
        <nav className="rail-nav" aria-label="Global modules">
          {GLOBAL_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={activeModule === module.id ? "rail-button active" : "rail-button"}
                type="button"
                onClick={() => onActiveModuleChange(module.id)}
                title={module.label}
                aria-label={module.label}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
        </nav>
        <div className="rail-total" title={getRailTotalTitle(activeModule, loading, imageTotal, capabilitySummary)}>
          {getRailTotal(activeModule, loading, imageTotal, capabilitySummary)}
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="CoMate navigation">
      <div className="sidebar-fixed">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <img src={comateIconUrl} alt="" />
          </span>
          <div className="brand-copy">
            <span className="brand-name">CoMate</span>
          </div>
        </div>

        <nav className="global-nav" aria-label="Global modules">
          {GLOBAL_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={activeModule === module.id ? "global-nav-item active" : "global-nav-item"}
                type="button"
                onClick={() => onActiveModuleChange(module.id)}
                title={module.description}
                aria-current={activeModule === module.id ? "page" : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{module.label}</span>
              </button>
            );
          })}
        </nav>

        {activeModule === "gallery" ? (
          <GalleryMenu
            promptState={promptState}
            isDateFilterActive={isDateFilterActive}
            onDatePresetChange={handleDatePresetChange}
            onPromptStateChange={onPromptStateChange}
          />
        ) : (
          <CapabilityMenu
            section={capabilitySection}
            summary={capabilitySummary}
            onSectionChange={onCapabilitySectionChange}
          />
        )}
      </div>

      {activeModule === "gallery" ? (
        <section className={sessionsExpanded ? "session-section" : "session-section collapsed"} aria-label="Sessions">
          <button
            className="session-section-toggle"
            type="button"
            onClick={() => setSessionsExpanded((current) => !current)}
            aria-expanded={sessionsExpanded}
          >
            <span>Sessions</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {sessionsExpanded ? (
            <div className="session-list">
              {sessions.slice(0, 36).map((session) => (
                <button
                  key={session.sessionId}
                  className={sessionId === session.sessionId ? "session-item active" : "session-item"}
                  onClick={() => onSessionChange(session.sessionId)}
                  title={session.threadName ?? session.sessionId}
                >
                  <span>{session.threadName ?? session.sessionId}</span>
                  <em>{session.count}</em>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="capability-sidebar-note" aria-label="Capability scan note">
          <strong>{capabilitySummary?.total ?? 0}</strong>
          <span>能力入口</span>
          <em>{capabilitySummary?.issueCount ?? 0} issues</em>
        </section>
      )}
    </aside>
  );
}

function GalleryMenu({
  promptState,
  isDateFilterActive,
  onDatePresetChange,
  onPromptStateChange
}: {
  promptState: PromptState;
  isDateFilterActive: (value: DatePreset) => boolean;
  onDatePresetChange: (value: DatePreset) => void;
  onPromptStateChange: (value: PromptState) => void;
}) {
  return (
    <>
      <nav className="filter-group module-menu" aria-label="Date filters">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            className={isDateFilterActive(filter.value) ? "filter-item active" : "filter-item"}
            onClick={() => onDatePresetChange(filter.value)}
          >
            {filter.value === "all" ? <ImageIcon size={16} /> : filter.value === "today" ? <Clock3 size={16} /> : <CalendarDays size={16} />}
            <span>{filter.label}</span>
          </button>
        ))}
      </nav>

      <div className="filter-group">
        <button
          className={promptState === "withPrompt" ? "filter-item active" : "filter-item"}
          onClick={() => onPromptStateChange(promptState === "withPrompt" ? "all" : "withPrompt")}
        >
          <MessageSquareText size={16} />
          <span>With prompt</span>
        </button>
        <button
          className={promptState === "withoutPrompt" ? "filter-item active" : "filter-item"}
          onClick={() => onPromptStateChange(promptState === "withoutPrompt" ? "all" : "withoutPrompt")}
        >
          <MessageSquareText size={16} />
          <span>No prompt</span>
        </button>
      </div>
    </>
  );
}

function CapabilityMenu({
  section,
  summary,
  onSectionChange
}: {
  section: CapabilitySection;
  summary: CapabilitySummary | null;
  onSectionChange: (value: CapabilitySection) => void;
}) {
  return (
    <nav className="filter-group module-menu capability-menu" aria-label="Capability sections">
      {CAPABILITY_MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const count = getCapabilityMenuCount(summary, item.id);
        return (
          <button
            key={item.id}
            className={section === item.id ? "filter-item capability-menu-item active" : "filter-item capability-menu-item"}
            onClick={() => onSectionChange(item.id)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{item.label}</span>
            <em>{count}</em>
          </button>
        );
      })}
    </nav>
  );
}

function getRailTotal(
  activeModule: AppModule,
  loading: boolean,
  imageTotal: number,
  capabilitySummary: CapabilitySummary | null
): string {
  if (activeModule === "gallery") {
    return loading ? "..." : String(imageTotal);
  }
  return String(capabilitySummary?.issueCount ?? 0);
}

function getRailTotalTitle(
  activeModule: AppModule,
  loading: boolean,
  imageTotal: number,
  capabilitySummary: CapabilitySummary | null
): string {
  if (activeModule === "gallery") {
    return loading ? "Loading" : `${imageTotal} images`;
  }
  return `${capabilitySummary?.issueCount ?? 0} capability issues`;
}
