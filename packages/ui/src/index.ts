export {
  Accordion,
  AccordionContent,
  type AccordionContentProps,
  AccordionItem,
  type AccordionItemProps,
  AccordionPanel,
  type AccordionPanelProps,
  type AccordionProps,
  AccordionTrigger,
  type AccordionTriggerProps,
  animateLayoutToggle,
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
  SkeletonCalendarTimeline,
  SkeletonCategoryGrid,
  SkeletonEpisodeList,
  SkeletonEpisodeRow,
  SkeletonHubStatTiles,
  SkeletonPill,
  type SkeletonPillProps,
  SkeletonPoster,
  SkeletonProfileBanner,
  SkeletonProfileHub,
  SkeletonProfilePage,
  SkeletonSearchResults,
  SkeletonSearchRow,
  SkeletonSectionHeader,
  SkeletonSeriesCard,
  SkeletonSeriesDetailHero,
  SkeletonSeriesGrid,
  SkeletonSettingsSections,
  SkeletonStatsHero,
  SkeletonStatsPage,
  type SkeletonStickySection,
  SkeletonWatchLists,
  seriesGridCols,
  skeletonCalendarStickySections,
  skeletonCategoryStickySections,
  skeletonWatchStickySections,
} from "./atoms/Skeleton.tsx";
export { StatTile, type StatTileProps } from "./atoms/StatTile.tsx";
export {
  StepperInput,
  type StepperInputLabels,
  type StepperInputProps,
} from "./atoms/StepperInput.tsx";
export { BrandSmoke, type BrandSmokeProps } from "./BrandSmoke.tsx";
export {
  calendarDaysBetween,
  type FormatAirDateLabelOptions,
  formatAirDateLabel,
} from "./lib/airDateLabel.ts";
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
export { borderStroke, borders } from "./lib/borders.ts";
export {
  buildScheduleGridModel,
  type ScheduleGridDayInput,
  type ScheduleGridEpisode,
  type ScheduleGridModel,
  type ScheduleWeekColumn,
} from "./lib/buildScheduleModel.ts";
export {
  CATEGORY_BG_COLORS,
  CATEGORY_TEXT_COLORS,
  progressTextColor,
  type WatchCategory,
} from "./lib/categoryColors.ts";
export { CATEGORY_ICONS } from "./lib/categoryIcons.ts";
export { cn } from "./lib/cn.ts";
export { type EpisodeLabelFormat, formatEpisodeLabel } from "./lib/episodeLabel.ts";
export {
  computeEpisodeTagKinds,
  type EpisodeTagKind,
  type EpisodeTagsInput,
  type EpisodeType,
  TAG_BORDERS,
  TAG_STYLES,
  TAG_TEXT,
} from "./lib/episodeTags.ts";
export {
  alignSeasonProgressAnnounced,
  buildProgressSegments,
  EMPTY_FRONTIER_MIN_PX,
  frontierFillWidth,
  isCaughtUpWaiting,
  type SeasonProgress,
  type SeasonProgressEntry,
  type Segment,
} from "./lib/progressSegments.ts";
export { reorderCombined, reorderSections } from "./lib/reorderSections.ts";
export {
  autoAdvanceIfSeasonJustCompleted,
  COMPLETED_SEASON_COLLAPSE_MIN,
  collapseCompletedSeasonRuns,
  defaultExpandedSeasonNumber,
  isSeasonComplete,
  isSeasonFinished,
  nextIncompleteSeasonAfter,
  type SeasonListEntry,
  seasonCompleteSnapshot,
  sortSeasonsSpecialsLast,
} from "./lib/seasons.ts";
export {
  computeOverflowBadge,
  shouldShowQuickMarkCheckbox,
} from "./lib/watchNext.ts";
export {
  getAbsoluteWeek,
  getIsoWeek,
  getWeekStartIso,
  mondayFirstDow,
} from "./lib/weeks.ts";
export {
  ActionSheet,
  type ActionSheetItem,
  type ActionSheetProps,
} from "./molecules/ActionSheet.tsx";
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
export { type CastMember, CastRail, type CastRailProps } from "./molecules/CastRail.tsx";
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
export {
  EpisodeDetailsSheet,
  type EpisodeDetailsSheetProps,
} from "./molecules/EpisodeDetailsSheet.tsx";
export { EpisodeTags, type EpisodeTagsProps } from "./molecules/EpisodeTags.tsx";
export { HBarList, type HBarListItem, type HBarListProps } from "./molecules/HBarList.tsx";
export { Heatmap, type HeatmapDay, type HeatmapProps } from "./molecules/Heatmap.tsx";
export {
  HeroBackdropFades,
  type HeroBackdropFadesProps,
} from "./molecules/HeroBackdropFades.tsx";
export { MiniBars, type MiniBarsItem, type MiniBarsProps } from "./molecules/MiniBars.tsx";
export { Modal, type ModalProps } from "./molecules/Modal.tsx";
export {
  NeedsReviewBanner,
  type NeedsReviewBannerProps,
} from "./molecules/NeedsReviewBanner.tsx";
export { NextUpCard, type NextUpCardProps } from "./molecules/NextUpCard.tsx";
export {
  OAuthButtons,
  type OAuthButtonsProps,
  type OAuthProviderId,
} from "./molecules/OAuthButtons.tsx";
export { PageTitleRow, type PageTitleRowProps } from "./molecules/PageTitleRow.tsx";
export {
  PullToRefresh,
  PullToRefreshList,
  type PullToRefreshListProps,
  type PullToRefreshProps,
} from "./molecules/PullToRefresh.tsx";
export {
  ScheduleGrid,
  type ScheduleGridProps,
} from "./molecules/ScheduleGrid.tsx";
export {
  ScheduleStrip,
  type ScheduleStripEntry,
  type ScheduleStripProps,
} from "./molecules/ScheduleStrip.tsx";
export {
  SearchResultThumb,
  type SearchResultThumbProps,
} from "./molecules/SearchResultThumb.tsx";
export {
  SEASON_PILL_SIZE,
  SEASON_PROGRESS_SIZE,
  SectionHeader,
  type SectionHeaderProps,
} from "./molecules/SectionHeader.tsx";
export {
  SeriesCard,
  type SeriesCardProps,
  type SeriesCardSeries,
} from "./molecules/SeriesCard.tsx";
export {
  SeriesDetailHero,
  type SeriesDetailHeroProps,
} from "./molecules/SeriesDetailHero.tsx";
export {
  SeriesDetailsSheet,
  type SeriesDetailsSheetDetail,
  type SeriesDetailsSheetLabels,
  type SeriesDetailsSheetProps,
} from "./molecules/SeriesDetailsSheet.tsx";
export {
  type LibrarySort,
  SortMenu,
  type SortMenuOption,
  type SortMenuProps,
} from "./molecules/SortMenu.tsx";
export {
  type StickySection,
  StickySectionScroll,
  type StickySectionScrollProps,
  stickyRows,
} from "./molecules/StickySectionScroll.tsx";
export {
  WatchDateSheet,
  type WatchDateSheetProps,
} from "./molecules/WatchDateSheet.tsx";
export {
  WatchNextRow,
  type WatchNextRowProps,
  type WatchNextSeries,
} from "./molecules/WatchNextRow.tsx";
export { EpisodeRow, type EpisodeRowProps } from "./organisms/EpisodeRow.tsx";
export { colors, fonts, space } from "./tokens.ts";

export const UI_PACKAGE = "@baykus/ui" as const;
