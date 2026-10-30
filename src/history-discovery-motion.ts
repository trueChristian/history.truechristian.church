interface MotionOptions {
  titles: HTMLElement;
  wheel: HTMLElement;
  bands: HTMLAnchorElement[];
  marker: HTMLElement;
  motion: MediaQueryList;
}

interface EntryMotion {
  row: HTMLElement;
  surface: HTMLElement;
  value: number;
  target: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Animate visual surfaces only; anchors and the document scroll retain native geometry. */
export function createDiscoveryMotion({titles, wheel, bands, marker, motion}: MotionOptions) {
  const faces = bands.map(band => band.querySelector<HTMLElement>('.discovery-band-face')!);
  const labels = bands.map(band => band.querySelector<HTMLElement>('.discovery-band-label')!);
  const visible = new Map<HTMLElement, EntryMotion>();
  let value: number | null = null;
  let target = 0, selected = 0, frame = 0, lastTime = 0;

  function entryTarget(row: HTMLElement) {
    if (motion.matches) return 1;
    const y = row.getBoundingClientRect().top;
    return 1 - smoothstep((y - innerHeight * .61) / (innerHeight * .39 + 24));
  }

  function drawEntry(item: EntryMotion) {
    const remaining = 1 - item.value;
    item.surface.style.setProperty('--entry-rise', `${(-22 * remaining).toFixed(3)}px`);
    item.surface.style.setProperty('--entry-opacity', (.42 + .58 * item.value).toFixed(4));
    item.surface.style.setProperty('--entry-blur', `${(1.35 * remaining).toFixed(3)}px`);
  }

  // The production collection has more than 1,500 titles. Only nearby, expanded
  // rows participate in the animation loop; closed disclosures remain ordinary HTML.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const row = entry.target as HTMLElement;
      if (entry.isIntersecting && !titles.hidden) {
        const target = entryTarget(row);
        const item = visible.get(row) || {
          row, surface: row.querySelector<HTMLElement>('.discovery-entry-surface')!, value: target, target
        };
        item.target = target;
        visible.set(row, item);
        row.classList.add('is-in-view');
        drawEntry(item);
      } else {
        const item = visible.get(row);
        if (item) {
          item.surface.style.removeProperty('--entry-rise');
          item.surface.style.removeProperty('--entry-opacity');
          item.surface.style.removeProperty('--entry-blur');
        }
        visible.delete(row);
        row.classList.remove('is-in-view');
      }
    }
    requestMotion();
  }, {rootMargin: '60px 0px'});
  titles.querySelectorAll<HTMLElement>('.discovery-list > li').forEach(row => observer.observe(row));

  function project(y: number, height: number) {
    if (motion.matches) return y;
    const half = height / 2;
    const unit = (y - half) / half;
    const bounded = clamp(unit, -1, 1);
    const edgeAngle = .78;
    return half + Math.sin(bounded * edgeAngle) / Math.sin(edgeAngle) * half + (unit - bounded) * half * .8;
  }

  function drawWheel() {
    const height = wheel.clientHeight;
    if (!height || value === null) return;
    const count = Math.min(bands.length, height < 390 ? 3.3 : 4.4);
    const pitch = height / count;
    const shift = clamp(value - (count - 1) / 2, 0, Math.max(0, bands.length - count)) * pitch;
    bands.forEach((band, index) => {
      const flatTop = index * pitch - shift;
      const flatCenter = flatTop + pitch / 2;
      const y = project(flatTop, height);
      const bottom = project(flatTop + pitch, height);
      const unit = clamp((flatCenter - height / 2) / (height / 2), -1, 1);
      const angle = motion.matches ? 0 : unit * .78;
      const depth = -height * .30 * (1 - Math.cos(angle));

      // Adjacent projected boundaries also define the unrotated click targets.
      // Perspective belongs to the face, never to the link or its focus outline.
      band.style.height = `${bottom - y}px`;
      band.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`;
      band.style.opacity = String(motion.matches || index === selected ? 1 : .96 - Math.abs(unit) * .18);
      faces[index].style.transform = motion.matches ? 'none' :
        `perspective(1000px) translateZ(${depth.toFixed(3)}px) rotateX(${(-angle * 180 / Math.PI).toFixed(3)}deg)`;
      labels[index].style.transform = motion.matches ? 'none' : `scaleX(${(1 - Math.abs(unit) * .035).toFixed(4)})`;
    });
    const markerY = project((selected + .5) * pitch - shift, height);
    marker.style.transform = `translate3d(0,${markerY.toFixed(3)}px,0)`;
    marker.style.opacity = markerY < 0 || markerY > height ? '0' : '1';
    wheel.dataset.position = value.toFixed(4);
    wheel.dataset.target = target.toFixed(4);
  }

  function advance(now: number) {
    frame = 0;
    const elapsed = clamp(now - lastTime, 1, 64);
    lastTime = now;
    const difference = target - value!;
    value = Math.abs(difference) < .0005 ? target : value! + difference * (1 - Math.exp(-elapsed / 95));
    let moving = value !== target;
    if (!titles.hidden) {
      for (const item of visible.values()) {
        const difference = item.target - item.value;
        item.value = Math.abs(difference) < .001 ? item.target : item.value + difference * (1 - Math.exp(-elapsed / 120));
        moving ||= item.value !== item.target;
        drawEntry(item);
      }
    }
    drawWheel();
    if (moving) frame = requestAnimationFrame(advance);
    else lastTime = 0;
  }

  function requestMotion(snap = false) {
    if (value === null || snap || motion.matches) value = target;
    if (motion.matches || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      value = target;
      for (const item of visible.values()) {
        item.value = motion.matches ? 1 : item.target;
        drawEntry(item);
      }
      drawWheel();
    } else if (!frame) {
      lastTime = performance.now();
      // Keyboard focus must reveal a clipped endpoint before the next paint.
      if (snap) drawWheel();
      frame = requestAnimationFrame(advance);
    } else if (snap) drawWheel();
  }

  function update(position: number, era: number, snap = false) {
    target = position;
    selected = era;
    if (!titles.hidden) {
      for (const item of visible.values()) item.target = entryTarget(item.row);
    }
    requestMotion(snap);
  }

  document.addEventListener('visibilitychange', () => update(target, selected, true));
  return {update};
}
