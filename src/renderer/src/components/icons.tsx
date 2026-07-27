// Single home for the Heroicons outline paths used across the app. Each icon was
// previously inlined at every call site — the eye-off path alone appeared in six
// files — so a tweak meant hunting down copies.

interface IconProps {
  className?: string
}

/** Shared wrapper so every icon has identical stroke/viewBox setup. */
function Icon({
  className,
  children
}: IconProps & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Path({ d }: { d: string }): React.JSX.Element {
  return <path strokeLinecap="round" strokeLinejoin="round" d={d} />
}

const EYE = 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z'
const EYE_PUPIL = 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
const EYE_OFF = 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88'
const HEART = 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
const BOOKMARK = 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z'
const TAG = 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z'
const TAG_DOT = 'M6 6h.008v.008H6V6z'
const SHUFFLE = 'M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3'
const SEARCH = 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
const CLOSE = 'M6 18L18 6M6 6l12 12'
const PLUS = 'M12 4v16m8-8H4'
const SORT = 'M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25'
const ARROW_UP = 'M12 19V5m0 0l-6 6m6-6l6 6'
const ARROW_DOWN = 'M12 5v14m0 0l6-6m-6 6l-6-6'
const CHECK = 'M4.5 12.75l6 6 9-13.5'
const CHEVRON_DOWN = 'M19 9l-7 7-7-7'
const WARNING = 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
const COG = 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z'

export function EyeIcon({ className = 'w-5 h-5' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={EYE} />
      <Path d={EYE_PUPIL} />
    </Icon>
  )
}

export function EyeOffIcon({ className = 'w-5 h-5' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={EYE_OFF} />
    </Icon>
  )
}

/** The eye-off glyph at the smaller size used to mark hidden entities. */
export function HiddenIcon({ className = 'w-3.5 h-3.5' }: IconProps): React.JSX.Element {
  return <EyeOffIcon className={className} />
}

interface FillableIconProps extends IconProps {
  filled?: boolean
  /** Colour used when `filled`; defaults to the inherited text colour. */
  fillColor?: string
  stroke?: string
}

/** Shared body for the icons that render hollow or solid depending on state. */
function FillableIcon({
  d,
  className,
  filled = false,
  fillColor = 'currentColor',
  stroke = 'currentColor'
}: FillableIconProps & { d: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? fillColor : 'none'}
      stroke={stroke}
      strokeWidth={2}
      aria-hidden="true"
    >
      <Path d={d} />
    </svg>
  )
}

export function HeartIcon({
  className = 'w-4 h-4',
  ...props
}: FillableIconProps): React.JSX.Element {
  return <FillableIcon d={HEART} className={className} {...props} />
}

export function BookmarkIcon({
  className = 'w-4 h-4',
  ...props
}: FillableIconProps): React.JSX.Element {
  return <FillableIcon d={BOOKMARK} className={className} {...props} />
}

export function TagIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={TAG} />
      <Path d={TAG_DOT} />
    </Icon>
  )
}

export function ShuffleIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={SHUFFLE} />
    </Icon>
  )
}

export function SearchIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={SEARCH} />
    </Icon>
  )
}

export function CloseIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={CLOSE} />
    </Icon>
  )
}

export function PlusIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={PLUS} />
    </Icon>
  )
}

export function SortIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={SORT} />
    </Icon>
  )
}

export function ArrowUpIcon({ className = 'w-3.5 h-3.5' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={ARROW_UP} />
    </Icon>
  )
}

export function ArrowDownIcon({ className = 'w-3.5 h-3.5' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={ARROW_DOWN} />
    </Icon>
  )
}

export function ChevronDownIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={CHEVRON_DOWN} />
    </Icon>
  )
}

export function WarningIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={WARNING} />
    </Icon>
  )
}

export function CheckIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={CHECK} />
    </Icon>
  )
}

/** Indeterminate spinner; filled rather than stroked, so it bypasses `Icon`. */
export function SpinnerIcon({ className = 'w-4 h-4' }: IconProps): React.JSX.Element {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export function CogIcon({ className = 'w-5 h-5' }: IconProps): React.JSX.Element {
  return (
    <Icon className={className}>
      <Path d={COG} />
      <Path d={EYE_PUPIL} />
    </Icon>
  )
}

interface ToggleProps {
  filled: boolean
  onClick: (e: React.MouseEvent) => void
  className?: string
}

/** Heart rendered as a clickable favourite toggle; shared by the comic and volume pages. */
export function HeartToggle({
  filled,
  onClick,
  className = 'w-4 h-4'
}: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={filled}
      aria-label={filled ? 'Remove from favourites' : 'Add to favourites'}
      className="text-current hover:opacity-75 transition-opacity cursor-pointer"
    >
      <HeartIcon className={className} filled={filled} />
    </button>
  )
}

/** Bookmark counterpart to `HeartToggle`, for marking a stop point. */
export function BookmarkToggle({
  filled,
  onClick,
  className = 'w-4 h-4'
}: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={filled}
      aria-label={filled ? 'Remove bookmark' : 'Add bookmark'}
      className="text-current hover:opacity-75 transition-opacity cursor-pointer"
    >
      <BookmarkIcon className={className} filled={filled} />
    </button>
  )
}
