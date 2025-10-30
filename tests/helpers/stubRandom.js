/**
 * Creates a deterministic substitute for Math.random that iterates through the provided numbers.
 *
 * The returned `restore` function reverts Math.random to its original implementation.
 *
 * @param {number[] | number} seq - Either a single number to be returned on every call, or an array of numbers that will be returned sequentially and looped.
 * @returns {() => void} A function that restores the original Math.random when invoked.
 */
function stubRandom(seq) {
  if (Array.isArray(seq) && seq.length === 0) {
    throw new Error('stubRandom requires at least one number in the sequence.');
  }

  const descriptor = Object.getOwnPropertyDescriptor(Math, 'random');
  const original = Math.random;

  const values = Array.isArray(seq) ? [...seq] : [seq];
  let index = 0;

  const stub = () => {
    const value = values[index];
    index = (index + 1) % values.length;
    return value;
  };

  if (descriptor) {
    Object.defineProperty(Math, 'random', { ...descriptor, value: stub });
  } else {
    // eslint-disable-next-line no-global-assign
    Math.random = stub;
  }

  return () => {
    if (descriptor) {
      Object.defineProperty(Math, 'random', { ...descriptor, value: original });
    } else {
      // eslint-disable-next-line no-global-assign
      Math.random = original;
    }
  };
}

module.exports = { stubRandom };
