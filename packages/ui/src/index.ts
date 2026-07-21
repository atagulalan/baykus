export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  type AccordionContentProps,
  type AccordionItemProps,
  type AccordionPanelProps,
  type AccordionProps,
  type AccordionTriggerProps,
} from "./atoms/Accordion.tsx";
export {
  CHECKBOX_ROUNDED_SIZE_PX,
  CHECKBOX_SIZE_PX,
  Checkbox,
  type CheckboxProps,
  type CheckboxVariant,
  ROUNDED_CHECKBOX_IDLE_CLASS,
  ROUNDED_CHECKBOX_SIZE_CLASS,
} from "./atoms/Checkbox.tsx";
export { CircularProgress, type CircularProgressProps } from "./atoms/CircularProgress.tsx";
export { EpisodeLabel, type EpisodeLabelProps } from "./atoms/EpisodeLabel.tsx";
export { MediaImage, type MediaImageProps } from "./atoms/MediaImage.tsx";
export { PageTitle, type PageTitleProps } from "./atoms/PageTitle.tsx";
export {
  RatingControl,
  type RatingControlLabels,
  type RatingControlProps,
  type RatingValue,
} from "./atoms/RatingControl.tsx";
export { ReleaseTime, type ReleaseTimeProps } from "./atoms/ReleaseTime.tsx";
export { SectionPill, type SectionPillProps } from "./atoms/SectionPill.tsx";
export {
  SegmentedButtonGroup,
  type SegmentedButtonGroupProps,
  type SegmentedOption,
} from "./atoms/SegmentedButtonGroup.tsx";
export { SegmentedProgress, type SegmentedProgressProps } from "./atoms/SegmentedProgress.tsx";
export {
  SettingsSelect,
  type SettingsSelectOption,
  type SettingsSelectProps,
} from "./atoms/SettingsSelect.tsx";
export {
  SkeletonBone,
  type SkeletonBoneProps,
  SkeletonPill,
  type SkeletonPillProps,
} from "./atoms/Skeleton.tsx";
export {
  StepperInput,
  type StepperInputLabels,
  type StepperInputProps,
} from "./atoms/StepperInput.tsx";
export { BrandSmoke, type BrandSmokeProps } from "./BrandSmoke.tsx";
export {
  type AiringFields,
  airInstantIso,
  formatAirStampLocal,
  formatAirStampOrigin,
  isEpisodeAired,
  msUntilAir,
  normalizeAirStamp,
  todayIso,
} from "./lib/airing.ts";
export {
  CATEGORY_BG_COLORS,
  CATEGORY_TEXT_COLORS,
  progressTextColor,
  type WatchCategory,
} from "./lib/categoryColors.ts";
export { cn } from "./lib/cn.ts";
export { type EpisodeLabelFormat, formatEpisodeLabel } from "./lib/episodeLabel.ts";
export {
  computeEpisodeTagKinds,
  type EpisodeTagKind,
  type EpisodeTagsInput,
  type EpisodeType,
  TAG_STYLES,
  TAG_TEXT,
} from "./lib/episodeTags.ts";
export {
  buildProgressSegments,
  isCaughtUpWaiting,
  type SeasonProgress,
  type SeasonProgressEntry,
  type Segment,
} from "./lib/progressSegments.ts";
export {
  computeOverflowBadge,
  shouldShowQuickMarkCheckbox,
} from "./lib/watchNext.ts";
export { reorderSections } from "./lib/reorderSections.ts";
export {
  AddSectionBar,
  type AddSectionBarLabels,
  type AddSectionBarProps,
} from "./molecules/AddSectionBar.tsx";
export {
  CalendarEntryRow,
  type CalendarEntryRowData,
  type CalendarEntryRowProps,
} from "./molecules/CalendarEntryRow.tsx";
export { CastRail, type CastMember, type CastRailProps } from "./molecules/CastRail.tsx";
export {
  CollapsedSeasonsGap,
  type CollapsedSeasonsGapProps,
} from "./molecules/CollapsedSeasonsGap.tsx";
export { ConfirmDialog, type ConfirmDialogProps } from "./molecules/ConfirmDialog.tsx";
export {
  EMPTY_PANEL_CTA_CLASS,
  EmptyPanel,
  type EmptyPanelProps,
} from "./molecules/EmptyPanel.tsx";
export { EpisodeTags, type EpisodeTagsProps } from "./molecules/EpisodeTags.tsx";
export { Modal, type ModalProps } from "./molecules/Modal.tsx";
export { NextUpCard, type NextUpCardProps } from "./molecules/NextUpCard.tsx";
export {
  OAuthButtons,
  type OAuthButtonsProps,
  type OAuthProviderId,
} from "./molecules/OAuthButtons.tsx";
export { PageTitleRow, type PageTitleRowProps } from "./molecules/PageTitleRow.tsx";
export { PullToRefresh, type PullToRefreshProps } from "./molecules/PullToRefresh.tsx";
export {
  SearchResultThumb,
  type SearchResultThumbProps,
} from "./molecules/SearchResultThumb.tsx";
export { SectionHeader, type SectionHeaderProps } from "./molecules/SectionHeader.tsx";
export {
  SeriesCard,
  type SeriesCardProps,
  type SeriesCardSeries,
} from "./molecules/SeriesCard.tsx";
export {
  SortMenu,
  type LibrarySort,
  type SortMenuOption,
  type SortMenuProps,
} from "./molecules/SortMenu.tsx";
export {
  WatchNextRow,
  type WatchNextRowProps,
  type WatchNextSeries,
} from "./molecules/WatchNextRow.tsx";
export { EpisodeRow, type EpisodeRowProps } from "./organisms/EpisodeRow.tsx";
export { colors, fonts, space } from "./tokens.ts";

export const UI_PACKAGE = "@baykus/ui" as const;
