import {
  CaseUpper, CaseLower, CaseSensitive, Type, Scissors, ArrowLeftToLine,
  ArrowRightToLine, Link2, Ruler, AlignLeft, AlignRight, FlipHorizontal, Code2, Hash,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'trim';

export const OPERATIONS = [
  { value: 'uppercase',   label: 'Uppercase',      group: 'Case',    icon: CaseUpper },
  { value: 'lowercase',   label: 'Lowercase',      group: 'Case',    icon: CaseLower },
  { value: 'titlecase',   label: 'Title Case',     group: 'Case',    icon: CaseSensitive },
  { value: 'capitalize',  label: 'Capitalize',     group: 'Case',    icon: Type },
  { value: 'camelcase',   label: 'camelCase',      group: 'Case',    icon: Type },
  { value: 'snakecase',   label: 'snake_case',     group: 'Case',    icon: Type },
  { value: 'trim',        label: 'Trim',           group: 'Trim',    icon: Scissors },
  { value: 'trim_start',  label: 'Trim Start',     group: 'Trim',    icon: ArrowLeftToLine },
  { value: 'trim_end',    label: 'Trim End',       group: 'Trim',    icon: ArrowRightToLine },
  { value: 'slug',        label: 'Slugify',        group: 'Convert', icon: Link2 },
  { value: 'truncate',    label: 'Truncate',       group: 'Convert', icon: Ruler },
  { value: 'pad_start',   label: 'Pad Start',      group: 'Convert', icon: AlignLeft },
  { value: 'pad_end',     label: 'Pad End',        group: 'Convert', icon: AlignRight },
  { value: 'reverse',     label: 'Reverse',        group: 'Convert', icon: FlipHorizontal },
  { value: 'remove_html', label: 'Strip HTML',     group: 'Convert', icon: Code2 },
  { value: 'wordcount',   label: 'Count Words',    group: 'Inspect', icon: Hash },
];
