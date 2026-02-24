export type SettingsSectionId = "personal" | "ai" | "feeds";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  href: `/dashboard/settings/${SettingsSectionId}`;
};

export const settingsSections: SettingsSection[] = [
  {
    id: "personal",
    label: "Personal",
    description: "Profile, password, active sessions, and subscription overview.",
    href: "/dashboard/settings/personal",
  },
  {
    id: "ai",
    label: "AI Profiles",
    description: "Provider, model, and default profile configuration for summarize actions.",
    href: "/dashboard/settings/ai",
  },
  {
    id: "feeds",
    label: "Feed Management",
    description: "Feed metadata, activity status, refresh actions, and cleanup.",
    href: "/dashboard/settings/feeds",
  },
];
