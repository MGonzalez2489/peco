/** Decoded keyset cursor for the stable `date DESC, id DESC` movement order (8.4). */
export interface MovementCursor {
  date: string;
  id: number;
}
