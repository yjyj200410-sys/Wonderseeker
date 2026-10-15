const root = document.documentElement;
const current = () => document.fullscreenElement || document.webkitFullscreenElement;
const request = root.requestFullscreen || root.webkitRequestFullscreen;
const standalone = () => !current() && (matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true);
const button = document.createElement('button');
button.type = 'button';
button.className = 'mobile-fullscreen-toggle';
document.body.append(button);
function sync() {
  button.textContent = current() ? '退出全屏' : '全屏游玩';
  button.setAttribute('aria-label', button.textContent);
  button.setAttribute('aria-pressed', String(!!current()));
  button.hidden = standalone() || !!current();
  root.classList.toggle('installed-display', standalone());
  document.querySelectorAll?.('[data-display-fullscreen]').forEach(control => { control.textContent = current() ? '退出全屏' : '全屏游玩'; });
}
function notify(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('visible'), 4500);
}
async function enter(quiet = false) {
  if (standalone() || current()) return;
  if (!request) {
    if (!quiet) notify('此浏览器不支持网页全屏；可在浏览器菜单中添加到主屏幕后打开。');
    return;
  }
  try {
    await request.call(root);
  } catch {
    if (!quiet) notify('浏览器暂未允许全屏，请在独立浏览器标签页中重试。');
  }
  sync();
}
async function toggle() {
  if (current()) {
    try { await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); } catch {}
    sync();
  } else await enter();
}
button.addEventListener('click', toggle);
document.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('[data-display-fullscreen]')) void toggle();
});
// Request within the actual tap; rotating the device alone has no user activation.
document.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('[data-action="enter-game"]') && matchMedia('(any-pointer: coarse) and (orientation: landscape)').matches) void enter(true);
}, {capture:true});
document.addEventListener('fullscreenchange', sync);
document.addEventListener('webkitfullscreenchange', sync);
sync();
