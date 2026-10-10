import { chownSync } from 'node:fs';
import { dirname } from 'node:path';
import { desktopToken } from './desktop.ts';
export function initializeDesktopSecret(path: string) { desktopToken(path); chownSync(dirname(path), 1000, 1000); chownSync(path, 1000, 1000); }
