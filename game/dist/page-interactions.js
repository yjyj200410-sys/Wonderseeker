// Keep the game surface from behaving like a selectable document.
const editable = target => target instanceof Element && !!target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])');
for (const type of ['selectstart', 'dragstart', 'copy', 'cut', 'contextmenu']) {
  document.addEventListener(type, event => {
    if (!editable(event.target)) event.preventDefault();
  }, { capture: true });
}
document.addEventListener('keydown', event => {
  if (!editable(event.target) && (event.ctrlKey || event.metaKey) && ['a', 'c', 'x'].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }
}, { capture: true });

// Mark asynchronously rendered artwork as non-draggable at the HTML level too.
function protectImages(node) {
  if (!(node instanceof Element)) return;
  if (node.matches('img')) node.draggable = false;
  node.querySelectorAll('img').forEach(image => { image.draggable = false; });
}
protectImages(document.body);
new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) protectImages(node);
}).observe(document.body, {childList:true, subtree:true});
