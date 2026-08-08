import { isCurrentWeek, weekLabelParts } from './DayChip';
import type { WeekStart } from '../settings';
import { Button } from './ui/Button';
import { Divider } from './ui/Divider';
import { ChevronLeft, ChevronRight } from './ui/icons';

type Props = {
  focusSunday: string;
  weekStart: WeekStart;
  loading: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoToday: () => void;
};

export function WeekBar({
  focusSunday,
  weekStart,
  loading,
  canNext,
  onPrev,
  onNext,
  onGoToday,
}: Props) {
  const onCurrentWeek = isCurrentWeek(focusSunday, weekStart);
  const { year, range } = weekLabelParts(focusSunday, weekStart);

  return (
    <div className="range-bar range-bar-header">
      <div className="range-nav week-nav">
        <Button
          variant="icon"
          size="sm"
          onClick={onPrev}
          disabled={loading}
          aria-label="Previous week"
        >
          <ChevronLeft />
        </Button>
        <div className="week-nav-label-stack" aria-live="polite">
          <span className="week-nav-year">{year}</span>
          <span className="week-nav-range">{range}</span>
        </div>
        <Button
          variant="icon"
          size="sm"
          onClick={onNext}
          disabled={loading || !canNext}
          aria-label="Next week"
        >
          <ChevronRight />
        </Button>
      </div>

      <Divider orientation="vertical" />

      <Button
        variant="secondary"
        disabled={loading || onCurrentWeek}
        aria-label="Go to today"
        onClick={onGoToday}
      >
        Today
      </Button>
    </div>
  );
}
