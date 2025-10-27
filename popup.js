// @ts-check
async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}
async function sendToContent(type, payload) {
  const id = await activeTabId();
  if (!id) return;
  try {
    const res = await chrome.tabs.sendMessage(id, { scope: 'mer-helper', type, payload });
    if (!res?.ok) console.warn('MerSearch popup error:', res?.error);
  } catch (e) {
    console.warn('MerSearch popup send fail:', e);
  }
}
document.getElementById('scanView').addEventListener('click', () => {
  sendToContent('scan', { mode: 'view', soldOnly: false, showBadges: true });
});
document.getElementById('scanAll').addEventListener('click', () => {
  sendToContent('scan', { mode: 'all', soldOnly: false, showBadges: true });
});
document.getElementById('toggleOverlay').addEventListener('click', () => {
  sendToContent('toggleOverlay', {});
});
