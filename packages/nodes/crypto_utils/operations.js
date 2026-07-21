import { Hash, FileSignature, ArrowRightLeft, ArrowLeftRight, Fingerprint, Dices } from 'lucide-react';

export const DEFAULT_OPERATION = 'hash';

export const OPERATIONS = [
  { value: 'hash',         label: 'Hash',          group: 'Digest',  icon: Hash },
  { value: 'hmac',         label: 'HMAC Sign',     group: 'Digest',  icon: FileSignature },
  { value: 'base64encode', label: 'Base64 Encode', group: 'Encoding', icon: ArrowRightLeft },
  { value: 'base64decode', label: 'Base64 Decode', group: 'Encoding', icon: ArrowLeftRight },
  { value: 'uuid',         label: 'Generate UUID', group: 'Generate', icon: Fingerprint },
  { value: 'random',       label: 'Random Bytes',  group: 'Generate', icon: Dices },
];
