// Served at /widget.js (see rewrite in next.config.mjs).
// Usage: <script src="https://YOUR-APP/widget.js" data-business="BUSINESS_ID" defer></script>
const SCRIPT = `(function () {
  var s = document.currentScript;
  if (!s) return;
  var id = s.getAttribute('data-business');
  if (!id || document.getElementById('dialdesk-widget')) return;
  var origin = new URL(s.src).origin;
  var requestedColor = s.getAttribute('data-color') || '';
  var color = /^#[0-9a-f]{3,8}$/i.test(requestedColor) ? requestedColor : '#14232F';
  var left = s.getAttribute('data-position') === 'left';

  var btn = document.createElement('button');
  btn.id = 'dialdesk-widget';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Talk to our receptionist');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'dialdesk-widget-panel');
  btn.textContent = 'Talk to us';
  btn.style.cssText = 'position:fixed;bottom:20px;' + (left ? 'left' : 'right') + ':20px;z-index:2147483646;border:0;border-radius:999px;padding:14px 20px;font:600 15px system-ui,sans-serif;color:#fff;background:' + color + ';cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)';

  var panel = document.createElement('div');
  panel.id = 'dialdesk-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Voice receptionist');
  panel.setAttribute('aria-modal', 'false');
  panel.style.cssText = 'position:fixed;bottom:80px;' + (left ? 'left' : 'right') + ':20px;z-index:2147483647;width:340px;max-width:calc(100vw - 24px);height:440px;max-height:calc(100vh - 100px);display:none;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3);background:#fff';
  var frame = document.createElement('iframe');
  frame.title = 'Voice receptionist';
  frame.allow = 'microphone';
  frame.setAttribute('referrerpolicy', 'origin');
  frame.style.cssText = 'border:0;width:100%;height:100%';
  panel.appendChild(frame);

  var loaded = false;
  btn.addEventListener('click', function () {
    var open = panel.style.display === 'none';
    if (open && !loaded) { frame.src = origin + '/embed/' + encodeURIComponent(id); loaded = true; }
    panel.style.display = open ? 'block' : 'none';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Talk to us';
    if (!open) btn.focus();
  });
  document.body.appendChild(panel);
  document.body.appendChild(btn);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel.style.display !== 'none') btn.click();
  });
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
