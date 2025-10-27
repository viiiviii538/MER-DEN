// @ts-check

const queueState = {
    items: [],
    running: false,
};

async function pump() {
    if (queueState.running) return;
    const next = queueState.items.shift();
    if (!next) return;
    queueState.running = true;
    try {
        const val = await next.task();
        next.resolve(val);
    } catch (e) {
        next.resolve(null);
    } finally {
        queueState.running = false;
        if (queueState.items.length) pump();
    }
}

function realEnqueue(task) {
    return new Promise((resolve) => {
        queueState.items.push({ task, resolve });
        pump();
    });
}

let enqueueImpl = realEnqueue;

function enqueue(task) {
    return enqueueImpl(task);
}

function __resetQueue() {
    queueState.items.length = 0;
    queueState.running = false;
}

function __setEnqueueImplementation(fn) {
    enqueueImpl = (typeof fn === 'function') ? fn : realEnqueue;
}

module.exports = {
    enqueue,
    __resetQueue,
    __setEnqueueImplementation,
};
