import { useState } from "react";
import { CalendarDays, ChevronDown, Clock3, Image as ImageIcon, MessageSquareText } from "lucide-react";

import type { CapabilitySummary, DatePreset, ImageSearchResult, PromptState, SessionFacet } from "../../shared/types.js";
import { getCapabilityMenuCount } from "../domain/capabilityView.js";
import { CAPABILITY_MENU_ITEMS, type AppModule, type CapabilitySection, getModuleTitle } from "../domain/navigation.js";

interface SidebarProps {
  activeModule: AppModule;
  capabilitySection: CapabilitySection;
  capabilitySummary: CapabilitySummary | null;
  collapsed: boolean;
  datePreset: DatePreset;
  imageFacets: ImageSearchResult["facets"];
  promptState: PromptState;
  sessionId: string | undefined;
  sessions: SessionFacet[];
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
  imageFacets,
  promptState,
  sessionId,
  sessions,
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
    return <aside className="sidebar collapsed" aria-label={`${getModuleTitle(activeModule)} filters`} aria-hidden="true" />;
  }

  return (
    <aside className="sidebar" aria-label={`${getModuleTitle(activeModule)} filters`}>
      <div className="sidebar-fixed">
        <header className="sidebar-module-header">
          <span>{getModuleTitle(activeModule)}</span>
        </header>

        {activeModule === "gallery" ? (
          <GalleryMenu
            imageFacets={imageFacets}
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
  imageFacets,
  promptState,
  isDateFilterActive,
  onDatePresetChange,
  onPromptStateChange
}: {
  imageFacets: ImageSearchResult["facets"];
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
            <em>{getDateFilterCount(filter.value, imageFacets)}</em>
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
          <em>{imageFacets.withPrompt}</em>
        </button>
        <button
          className={promptState === "withoutPrompt" ? "filter-item active" : "filter-item"}
          onClick={() => onPromptStateChange(promptState === "withoutPrompt" ? "all" : "withoutPrompt")}
        >
          <MessageSquareText size={16} />
          <span>No prompt</span>
          <em>{imageFacets.withoutPrompt}</em>
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

function getDateFilterCount(value: DatePreset, imageFacets: ImageSearchResult["facets"]): number {
  switch (value) {
    case "today":
      return imageFacets.today;
    case "week":
      return imageFacets.last7Days;
    case "month":
      return imageFacets.last30Days;
    case "all":
      return imageFacets.totalImages;
  }
}
