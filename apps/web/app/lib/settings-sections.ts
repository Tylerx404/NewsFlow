export type SettingsSectionId = "appearance" | "personal" | "ai" | "feeds";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  href: `/settings/${SettingsSectionId}`;
};

type Translate = (key: string) => string;

export const getSettingsSections = (t: Translate): SettingsSection[] => [
  {
    id: "appearance",
    label: t("settings.sections.appearance.label"),
    description: t("settings.sections.appearance.description"),
    href: "/settings/appearance",
  },
  {
    id: "personal",
    label: t("settings.sections.personal.label"),
    description: t("settings.sections.personal.description"),
    href: "/settings/personal",
  },
  {
    id: "ai",
    label: t("settings.sections.ai.label"),
    description: t("settings.sections.ai.description"),
    href: "/settings/ai",
  },
  {
    id: "feeds",
    label: t("settings.sections.feeds.label"),
    description: t("settings.sections.feeds.description"),
    href: "/settings/feeds",
  },
];
