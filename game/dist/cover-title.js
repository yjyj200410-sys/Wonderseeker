const asset = (name, version = 1) => `./assets/title-ui/${name}-v${version}.png`;

function glyph(name, order, tilt) {
  return `<span class="cover-glyph" style="--piece-delay:${order * 90}ms;--float-delay:${900 + order * 160}ms;--glyph-tilt:${tilt}deg"><img src="${asset('glyph-' + name, name === 'yi' ? 2 : 1)}" alt="" width="1254" height="1254" fetchpriority="high" decoding="async" draggable="false"></span>`;
}

export function renderCoverTitle() {
  return `<div class="cover-wordmark">Wonderseeker</div>
    <h1 class="cover-title"><span class="sr-only">异想寻宝家</span>
      <span class="cover-title-art" aria-hidden="true">
        <span class="cover-treasure-route"></span>
        <span class="cover-ornament cover-map"><img src="${asset('ornament-map')}" alt="" draggable="false"></span>
        <span class="cover-ornament cover-compass"><img src="${asset('ornament-compass')}" alt="" draggable="false"></span>
        <span class="cover-row cover-row-upper">${glyph('yi', 0, -3)}${glyph('xiang', 1, 2)}</span>
        <span class="cover-row cover-row-lower">${glyph('xun', 2, -3)}${glyph('bao', 3, 1)}${glyph('jia', 4, 3)}</span>
        <span class="cover-ornament cover-key"><img src="${asset('ornament-key')}" alt="" draggable="false"></span>
        <span class="cover-spark cover-spark-gold"></span><span class="cover-spark cover-spark-blue"></span><span class="cover-spark cover-spark-small"></span>
      </span>
    </h1>`;
}

export function renderCoverButton() {
  return `<button class="cover-enter" data-action="enter-game" aria-label="进入游戏"><img src="${asset('button-enter')}" alt="" width="2206" height="713" fetchpriority="high" draggable="false"></button>`;
}
