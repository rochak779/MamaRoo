import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type BackButtonProps =
  | { href: string; label: string; onClick?: never }
  | { href?: never; label: string; onClick: () => void };

// The circular back-link pattern already hand-rolled per screen (Summary,
// Notes, Letters, the Guide screens, ...) -- extracted here so the screens
// that never got one (medicines, reports, appointments, vitals, advice, and
// every /me/* sub-page) can add it without inventing a new look.
export function BackButton(props: BackButtonProps) {
  const className =
    "tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";
  const icon = <Icon name="ArrowLeft" size="inline" />;

  if (props.href) {
    return (
      <Link href={props.href} aria-label={props.label} className={className}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={props.label} onClick={props.onClick} className={className}>
      {icon}
    </button>
  );
}
