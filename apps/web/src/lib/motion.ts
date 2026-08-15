import { useState } from 'react';

/**
 * True once the first paint is done.
 *
 * A part of the document animates when you add it. The same parts must not animate when
 * the page opens, or every CV arrives with a wave across it. This flag separates the two:
 * a component that mounts during the first render reads `false` and stays still, and a
 * component that mounts after it reads `true` and comes in.
 */
let painted = false;

if (typeof window !== 'undefined') {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      painted = true;
    });
  });
}

/**
 * The class for a part that has just been added, or nothing on the first paint.
 *
 * Read once, at mount. The value must not change for the life of the component, or a
 * later render would replay the entrance.
 */
export function useEnter(): string {
  const [fresh] = useState(() => painted);
  return fresh ? 'is-entering' : '';
}

/*
 * There is no matching exit.
 *
 * There was one. A part that you deleted stayed in the document for 130ms so it could be
 * seen leaving, and a timer committed the deletion afterwards. That put the data behind
 * the timer: anything that stopped the timer from running left the deleted part in the
 * document with `opacity: 0` on it. The part was then invisible and still held its space,
 * which is the blank gap that appeared in the header after deleting a contact detail and
 * under a job after deleting an entry.
 *
 * A deletion now commits on the press. Nothing waits, thus nothing can be stranded.
 *
 * This also reads better. `review-animations` puts "delete the animation" first in its
 * remedial order, and a delete is the case for it: the one thing a person needs from a
 * delete is proof that the thing is gone. An interface that holds the deleted item on
 * screen for another eighth of a second, however smoothly, is answering a question that
 * nobody asked. The press itself still gives feedback, and the item is gone.
 */
