/**
 * Creates a deterministic substitute for {@link Math.random} that iterates through the provided numbers.
 *
 * The returned `restore` function reverts {@link Math.random} to its original implementation.
 *
 * @param seq - Either a single number to be returned on every call, or an array of numbers that will be returned sequentially and looped.
 * @returns A function that restores the original {@link Math.random} when invoked.
 */
export function stubRandom(seq: number[] | number): () => void {
  if (Array.isArray(seq) && seq.length === 0) {
    throw new Error('stubRandom requires at least one number in the sequence.');
  }

  const descriptor = Object.getOwnPropertyDescriptor(Math, 'random');
  const original = Math.random;

  const values = Array.isArray(seq) ? [...seq] : [seq];
  let index = 0;

  const stub = (): number => {
    const value = values[index];
    index = (index + 1) % values.length;
    return value;
  };

  if (descriptor) {
    Object.defineProperty(Math, 'random', { ...descriptor, value: stub });
  } else {
    (Math as unknown as { random: typeof Math.random }).random = stub;
  }

  return () => {
    if (descriptor) {
      Object.defineProperty(Math, 'random', { ...descriptor, value: original });
    } else {
      (Math as unknown as { random: typeof Math.random }).random = original;
    }
  };
}
