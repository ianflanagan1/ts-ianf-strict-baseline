// A package whose dependency reads the clock.
import { stamp } from 'stamps-time';

export const stamped = (label: string): unknown => stamp(label);
