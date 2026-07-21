import {
  Search, Save, Trash2, HelpCircle, Plus, Minus, Timer, Clock, List, Layers,
  Copy, Type, Tag, Pin, Activity, ArrowDownToLine, ArrowUpToLine, ArrowUp, ArrowDown,
  Ruler, Boxes, CircleDot, Hash, Radio, Key, Braces,
} from 'lucide-react';

export const DEFAULT_OPERATION = 'get';

export const OPERATIONS = [
  { value: 'get',        label: 'Get Value',          group: 'Keys',   icon: Search },
  { value: 'set',        label: 'Set Value',          group: 'Keys',   icon: Save },
  { value: 'setnx',      label: 'Set If Not Exists',  group: 'Keys',   icon: Plus },
  { value: 'getset',     label: 'Get And Set',        group: 'Keys',   icon: Copy },
  { value: 'append',     label: 'Append To Value',    group: 'Keys',   icon: Type },
  { value: 'del',        label: 'Delete Key',         group: 'Keys',   icon: Trash2 },
  { value: 'exists',     label: 'Key Exists',         group: 'Keys',   icon: HelpCircle },
  { value: 'type',       label: 'Get Key Type',       group: 'Keys',   icon: Tag },
  { value: 'rename',     label: 'Rename Key',         group: 'Keys',   icon: Pin },
  { value: 'keys',       label: 'Find Keys',          group: 'Keys',   icon: Key },
  { value: 'mget',       label: 'Get Many',           group: 'Keys',   icon: Boxes },
  { value: 'mset',       label: 'Set Many',           group: 'Keys',   icon: Braces },
  { value: 'incr',       label: 'Increment',          group: 'Keys',   icon: ArrowUp },
  { value: 'decr',       label: 'Decrement',          group: 'Keys',   icon: ArrowDown },
  { value: 'expire',     label: 'Set Expiry',         group: 'Keys',   icon: Timer },
  { value: 'ttl',        label: 'Get Time To Live',   group: 'Keys',   icon: Clock },
  { value: 'persist',    label: 'Remove Expiry',      group: 'Keys',   icon: Pin },
  { value: 'ping',       label: 'Ping Server',        group: 'Keys',   icon: Activity },

  { value: 'lpush',      label: 'Push To List Head',  group: 'Lists',  icon: ArrowUpToLine },
  { value: 'rpush',      label: 'Push To List Tail',  group: 'Lists',  icon: ArrowDownToLine },
  { value: 'lpop',       label: 'Pop From List Head', group: 'Lists',  icon: ArrowUp },
  { value: 'rpop',       label: 'Pop From List Tail', group: 'Lists',  icon: ArrowDown },
  { value: 'lrange',     label: 'Get List Range',     group: 'Lists',  icon: List },
  { value: 'llen',       label: 'Get List Length',    group: 'Lists',  icon: Ruler },

  { value: 'sadd',       label: 'Add To Set',         group: 'Sets',   icon: Plus },
  { value: 'srem',       label: 'Remove From Set',    group: 'Sets',   icon: Minus },
  { value: 'smembers',   label: 'Get Set Members',    group: 'Sets',   icon: Layers },
  { value: 'sismember',  label: 'Is In Set',          group: 'Sets',   icon: HelpCircle },
  { value: 'scard',      label: 'Get Set Size',       group: 'Sets',   icon: Ruler },
  { value: 'zadd',       label: 'Add To Sorted Set',  group: 'Sets',   icon: CircleDot },
  { value: 'zrange',     label: 'Get Sorted Range',   group: 'Sets',   icon: List },
  { value: 'zscore',     label: 'Get Member Score',   group: 'Sets',   icon: Search },

  { value: 'hset',       label: 'Set Hash Field',     group: 'Hashes', icon: Save },
  { value: 'hget',       label: 'Get Hash Field',     group: 'Hashes', icon: Search },
  { value: 'hgetall',    label: 'Get Whole Hash',     group: 'Hashes', icon: Hash },
  { value: 'hmset',      label: 'Set Hash Fields',    group: 'Hashes', icon: Braces },
  { value: 'hdel',       label: 'Delete Hash Field',  group: 'Hashes', icon: Trash2 },
  { value: 'hexists',    label: 'Hash Field Exists',  group: 'Hashes', icon: HelpCircle },
  { value: 'hkeys',      label: 'Get Hash Keys',      group: 'Hashes', icon: Key },
  { value: 'hvals',      label: 'Get Hash Values',    group: 'Hashes', icon: List },
  { value: 'hincrby',    label: 'Increment Hash Field', group: 'Hashes', icon: ArrowUp },

  { value: 'publish',    label: 'Publish Message',    group: 'PubSub', icon: Radio },
];
