// A core type with a field that holds an instance of a third-party class, whose methods change it.
import type { Moment } from 'moment';

export type Delivery = { readonly at: Moment };
