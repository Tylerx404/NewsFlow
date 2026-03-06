export type SettingsSectionId = "appearance" | "personal" | "ai" | "feeds";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  href: `/settings/${SettingsSectionId}`;
};

export const settingsSections: SettingsSection[] = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme mode, reading colors, typography, and article layout preferences.",
    href: "/settings/appearance",
  },
  {
    id: "personal",
    label: "Personal",
    description: "Profile, password, active sessions, and subscription overview.",
    href: "/settings/personal",
  },
  {
    id: "ai",
    label: "AI Profiles",
    description: "Provider, model, and default profile configuration for summarize actions.",
    href: "/settings/ai",
  },
  {
    id: "feeds",
    label: "Feed Management",
    description: "Feed metadata, activity status, refresh actions, and cleanup.",
    href: "/settings/feeds",
  },
];
