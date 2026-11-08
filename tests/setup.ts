// IndexedDB in Node, and a fixed time zone so local calendar days are the same on every laptop.
// T0 = 2026-11-09T15:00:00Z is 10:00 on Monday 9 November in New York.
import 'fake-indexeddb/auto';

process.env.TZ = 'America/New_York';
