import { errorMessage } from '../home/openItem.ts';

export interface MoveItemPorts {
  readonly file: (id: string, collectionId: string | null) => void;
  /** DESIGN.md §7: a light tick on moving an item. */
  readonly tick: () => void;
  readonly warn: (message: string) => void;
  /** The item stayed where it was; say so on screen. */
  readonly tellUser: () => void;
}

export interface Move {
  readonly id: string;
  readonly from: string | null;
  /** Null is the Inbox. */
  readonly to: string | null;
}

/** The tick confirms a move that is on disk, so it only comes after the write. */
export function createMoveItem({ file, tick, warn, tellUser }: MoveItemPorts) {
  return function moveItem({ id, from, to }: Move): void {
    if (from === to) return;
    try {
      file(id, to);
    } catch (error) {
      warn(`Could not move an item: ${errorMessage(error)}`);
      tellUser();
      return;
    }
    tick();
  };
}
