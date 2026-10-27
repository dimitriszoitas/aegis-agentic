import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { forwardRef } from 'react';
import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from '@hugeicons/react';
import {
  AiSparklesIcon,
  AlertCircleIcon,
  ArchiveIcon,
  ArrowDown02Icon,
  ArrowDownRight01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  BellIcon,
  BellRingIcon,
  BracesIcon,
  CalendarDaysIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsDownUpIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleIcon,
  ClipboardIcon,
  Clock01Icon,
  ClockHour3Icon,
  CopyIcon,
  DatabaseIcon,
  Delete02Icon,
  Download01Icon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FileChartColumnIcon,
  FileCodeIcon,
  FingerPrintIcon,
  Flag02Icon,
  FlaskConicalIcon,
  Folder01Icon,
  FunnelIcon,
  Globe02Icon,
  GripVerticalIcon,
  InfoIcon,
  KeyRoundIcon,
  Layers01Icon,
  LayoutDashboardIcon,
  LayoutThreeColumnIcon,
  LayoutTwoColumnIcon,
  Link04Icon,
  ListCollapseIcon,
  ListIcon,
  LoaderCircleIcon,
  LocateFixedIcon,
  MessageSquareIcon,
  MinusIcon,
  MonitorIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PanelLeftOpenIcon,
  PanelsTopLeftIcon,
  PaperclipIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  PlusIcon,
  Pulse01Icon,
  RadioTowerIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Rows2Icon,
  Rows3Icon,
  Rows4Icon,
  Search01Icon,
  SearchXIcon,
  ServerIcon,
  Settings01Icon,
  Shield01Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SlashIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  Sun03Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TriangleAlertIcon,
  UnfoldMoreIcon,
  UserIcon,
  UserRoundCheckIcon,
  UserRoundIcon,
  UserRoundMinusIcon,
  XIcon,
} from '@hugeicons/core-free-icons';

export type IconProps = Omit<HugeiconsIconProps, 'icon'>;

/** Shared sizing, accessible naming and gradient support for the Hugeicons pack. */
function createIcon(name: string, icon: IconSvgElement) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size, strokeWidth, style, className, ...props },
    ref,
  ) {
    const tokens = useComponentTokenNumbers(['icon-stroke', 'icon-default']);
    const iconSize =
      size ?? (props.absoluteStrokeWidth ? tokens['icon-default'] : componentToken('icon-default'));
    const paint =
      typeof style?.stroke === 'string' && style.stroke.startsWith('url(')
        ? style.stroke
        : undefined;
    const labelled = props['aria-label'] || props['aria-labelledby'];
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={iconSize}
        strokeWidth={strokeWidth ?? tokens['icon-stroke']}
        aria-hidden={labelled ? undefined : true}
        focusable="false"
        {...props}
        className={['aegis-icon', className].filter(Boolean).join(' ')}
        style={style}
        {...(paint ? { primaryColor: paint, secondaryColor: paint } : {})}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}

export const Activity = /* @__PURE__ */ createIcon('Activity', Pulse01Icon);
export const Archive = /* @__PURE__ */ createIcon('Archive', ArchiveIcon);
export const ArrowDown = /* @__PURE__ */ createIcon('ArrowDown', ArrowDown02Icon);
export const ArrowDownRight = /* @__PURE__ */ createIcon('ArrowDownRight', ArrowDownRight01Icon);
export const ArrowLeft = /* @__PURE__ */ createIcon('ArrowLeft', ArrowLeft02Icon);
export const ArrowRight = /* @__PURE__ */ createIcon('ArrowRight', ArrowRight02Icon);
export const ArrowUp = /* @__PURE__ */ createIcon('ArrowUp', ArrowUp02Icon);
export const ArrowUpDown = /* @__PURE__ */ createIcon('ArrowUpDown', ArrowUpDownIcon);
export const ArrowUpRight = /* @__PURE__ */ createIcon('ArrowUpRight', ArrowUpRight01Icon);
export const Bell = /* @__PURE__ */ createIcon('Bell', BellIcon);
export const BellRing = /* @__PURE__ */ createIcon('BellRing', BellRingIcon);
export const Braces = /* @__PURE__ */ createIcon('Braces', BracesIcon);
export const CalendarDays = /* @__PURE__ */ createIcon('CalendarDays', CalendarDaysIcon);
export const Check = /* @__PURE__ */ createIcon('Check', CheckIcon);
export const CheckCheck = /* @__PURE__ */ createIcon('CheckCheck', CheckCheckIcon);
export const CheckCircle2 = /* @__PURE__ */ createIcon('CheckCircle2', CircleCheckIcon);
export const ChevronDown = /* @__PURE__ */ createIcon('ChevronDown', ChevronDownIcon);
export const ChevronLeft = /* @__PURE__ */ createIcon('ChevronLeft', ChevronLeftIcon);
export const ChevronRight = /* @__PURE__ */ createIcon('ChevronRight', ChevronRightIcon);
export const ChevronUp = /* @__PURE__ */ createIcon('ChevronUp', ChevronUpIcon);
export const ChevronsDownUp = /* @__PURE__ */ createIcon('ChevronsDownUp', ChevronsDownUpIcon);
export const ChevronsUpDown = /* @__PURE__ */ createIcon('ChevronsUpDown', UnfoldMoreIcon);
export const Circle = /* @__PURE__ */ createIcon('Circle', CircleIcon);
export const CircleAlert = /* @__PURE__ */ createIcon('CircleAlert', AlertCircleIcon);
export const CircleCheck = /* @__PURE__ */ createIcon('CircleCheck', CircleCheckIcon);
export const CircleDot = /* @__PURE__ */ createIcon('CircleDot', CircleDotIcon);
export const Clipboard = /* @__PURE__ */ createIcon('Clipboard', ClipboardIcon);
export const Clock = /* @__PURE__ */ createIcon('Clock', Clock01Icon);
export const Clock3 = /* @__PURE__ */ createIcon('Clock3', ClockHour3Icon);
export const Columns2 = /* @__PURE__ */ createIcon('Columns2', LayoutTwoColumnIcon);
export const Columns3 = /* @__PURE__ */ createIcon('Columns3', LayoutThreeColumnIcon);
export const Copy = /* @__PURE__ */ createIcon('Copy', CopyIcon);
export const Database = /* @__PURE__ */ createIcon('Database', DatabaseIcon);
export const Download = /* @__PURE__ */ createIcon('Download', Download01Icon);
export const ExternalLink = /* @__PURE__ */ createIcon('ExternalLink', ExternalLinkIcon);
export const Eye = /* @__PURE__ */ createIcon('Eye', EyeIcon);
export const EyeOff = /* @__PURE__ */ createIcon('EyeOff', EyeOffIcon);
export const FileChartColumn = /* @__PURE__ */ createIcon('FileChartColumn', FileChartColumnIcon);
export const FileCode = /* @__PURE__ */ createIcon('FileCode', FileCodeIcon);
export const FileCode2 = /* @__PURE__ */ createIcon('FileCode2', FileCodeIcon);
export const Fingerprint = /* @__PURE__ */ createIcon('Fingerprint', FingerPrintIcon);
export const Flag = /* @__PURE__ */ createIcon('Flag', Flag02Icon);
export const FlaskConical = /* @__PURE__ */ createIcon('FlaskConical', FlaskConicalIcon);
export const Folder = /* @__PURE__ */ createIcon('Folder', Folder01Icon);
export const Funnel = /* @__PURE__ */ createIcon('Funnel', FunnelIcon);
export const Globe = /* @__PURE__ */ createIcon('Globe', Globe02Icon);
export const Globe2 = /* @__PURE__ */ createIcon('Globe2', Globe02Icon);
export const GripVertical = /* @__PURE__ */ createIcon('GripVertical', GripVerticalIcon);
export const Info = /* @__PURE__ */ createIcon('Info', InfoIcon);
export const KeyRound = /* @__PURE__ */ createIcon('KeyRound', KeyRoundIcon);
export const Layers = /* @__PURE__ */ createIcon('Layers', Layers01Icon);
export const LayoutDashboard = /* @__PURE__ */ createIcon('LayoutDashboard', LayoutDashboardIcon);
export const Link2 = /* @__PURE__ */ createIcon('Link2', Link04Icon);
export const List = /* @__PURE__ */ createIcon('List', ListIcon);
export const ListCollapse = /* @__PURE__ */ createIcon('ListCollapse', ListCollapseIcon);
export const LoaderCircle = /* @__PURE__ */ createIcon('LoaderCircle', LoaderCircleIcon);
export const LocateFixed = /* @__PURE__ */ createIcon('LocateFixed', LocateFixedIcon);
export const MessageSquare = /* @__PURE__ */ createIcon('MessageSquare', MessageSquareIcon);
export const Minus = /* @__PURE__ */ createIcon('Minus', MinusIcon);
export const Monitor = /* @__PURE__ */ createIcon('Monitor', MonitorIcon);
export const Moon = /* @__PURE__ */ createIcon('Moon', Moon02Icon);
export const MoreHorizontal = /* @__PURE__ */ createIcon('MoreHorizontal', MoreHorizontalIcon);
export const PanelLeft = /* @__PURE__ */ createIcon('PanelLeft', PanelLeftIcon);
export const PanelLeftClose = /* @__PURE__ */ createIcon('PanelLeftClose', PanelLeftOpenIcon);
export const PanelLeftOpen = /* @__PURE__ */ createIcon('PanelLeftOpen', PanelLeftCloseIcon);
export const PanelsTopLeft = /* @__PURE__ */ createIcon('PanelsTopLeft', PanelsTopLeftIcon);
export const Paperclip = /* @__PURE__ */ createIcon('Paperclip', PaperclipIcon);
export const Pencil = /* @__PURE__ */ createIcon('Pencil', PencilIcon);
export const Pin = /* @__PURE__ */ createIcon('Pin', PinIcon);
export const PinOff = /* @__PURE__ */ createIcon('PinOff', PinOffIcon);
export const Play = /* @__PURE__ */ createIcon('Play', PlayIcon);
export const Plus = /* @__PURE__ */ createIcon('Plus', PlusIcon);
export const RadioTower = /* @__PURE__ */ createIcon('RadioTower', RadioTowerIcon);
export const RefreshCw = /* @__PURE__ */ createIcon('RefreshCw', RefreshCwIcon);
export const RotateCcw = /* @__PURE__ */ createIcon('RotateCcw', RotateCcwIcon);
export const Rows2 = /* @__PURE__ */ createIcon('Rows2', Rows2Icon);
export const Rows3 = /* @__PURE__ */ createIcon('Rows3', Rows3Icon);
export const Rows4 = /* @__PURE__ */ createIcon('Rows4', Rows4Icon);
export const Search = /* @__PURE__ */ createIcon('Search', Search01Icon);
export const SearchX = /* @__PURE__ */ createIcon('SearchX', SearchXIcon);
export const Server = /* @__PURE__ */ createIcon('Server', ServerIcon);
export const Settings = /* @__PURE__ */ createIcon('Settings', Settings01Icon);
export const Shield = /* @__PURE__ */ createIcon('Shield', Shield01Icon);
export const ShieldAlert = /* @__PURE__ */ createIcon('ShieldAlert', ShieldAlertIcon);
export const ShieldCheck = /* @__PURE__ */ createIcon('ShieldCheck', ShieldCheckIcon);
export const Slash = /* @__PURE__ */ createIcon('Slash', SlashIcon);
export const SlidersHorizontal = /* @__PURE__ */ createIcon(
  'SlidersHorizontal',
  SlidersHorizontalIcon,
);
export const Sparkles = /* @__PURE__ */ createIcon('Sparkles', AiSparklesIcon);
export const Square = /* @__PURE__ */ createIcon('Square', SquareIcon);
export const Sun = /* @__PURE__ */ createIcon('Sun', Sun03Icon);
export const ThumbsDown = /* @__PURE__ */ createIcon('ThumbsDown', ThumbsDownIcon);
export const ThumbsUp = /* @__PURE__ */ createIcon('ThumbsUp', ThumbsUpIcon);
export const Trash2 = /* @__PURE__ */ createIcon('Trash2', Delete02Icon);
export const TriangleAlert = /* @__PURE__ */ createIcon('TriangleAlert', TriangleAlertIcon);
export const User = /* @__PURE__ */ createIcon('User', UserIcon);
export const UserRound = /* @__PURE__ */ createIcon('UserRound', UserRoundIcon);
export const UserRoundCheck = /* @__PURE__ */ createIcon('UserRoundCheck', UserRoundCheckIcon);
export const UserRoundMinus = /* @__PURE__ */ createIcon('UserRoundMinus', UserRoundMinusIcon);
export const X = /* @__PURE__ */ createIcon('X', XIcon);
