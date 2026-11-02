// A slowly orbiting map of my GitHub projects, drawn behind the page text.
// Solid white dots are repos, hollow rings are the tags that connect them,
// and faint specks are private repos. No libraries.
(function () {
  "use strict";

  var canvas = document.getElementById("galaxy");
  var ctx = canvas.getContext("2d");
  var intro = document.getElementById("intro");
  var card = document.getElementById("card");
  var hint = document.getElementById("hint-action");
  var hintLine = document.getElementById("hint");

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(hover: none)").matches;

  var WHITE = "255, 255, 255";
  var STEP = 1000 / 60;
  var ORBIT_SPEED = 0.00045; // radians per step, about one lap in four minutes
  var INTRO_MS = 1500;
  var HUB_ORDER = ["JavaScript", "Overwatch", "Postgres", "React", "Python", "Robotics Cats"];

  var width = 0;
  var height = 0;
  var dpr = 1;
  var center = { x: 0, y: 0 };
  var ring = { a: 1, b: 1 }; // semi-axes of the orbit
  var keepOut = { left: 0, right: 0, top: 0, bottom: 0 }; // around the text
  var narrow = false; // the text spans the screen, so nodes can't circle it
  var cramped = false;

  var nodes = [];
  var links = [];
  var hubs = {};

  var pointer = { x: -9999, y: -9999, onCanvas: false };
  var hovered = null;
  var focused = null; // keyboard focus or a tap
  var locked = null; // a hub clicked to keep its connections lit
  var dragged = null;
  var press = null;
  var waves = [];
  var orbitEase = 1;
  var startedAt = 0;
  var running = false;

  // ---- build the graph ---------------------------------------------------

  function makeNode(fields) {
    return Object.assign(
      { x: 0, y: 0, vx: 0, vy: 0, r: 3, ringAt: 1, neighbors: [], glow: 0 },
      fields
    );
  }

  function build() {
    (window.PROJECTS || []).forEach(function (project) {
      var node = makeNode({
        kind: "repo",
        label: project.name,
        about: project.about,
        url: project.url,
        live: !!project.live,
        r: 3.5 + 1.9 * Math.log(1 + project.weight),
        ringAt: 0.92 + Math.random() * 0.2,
      });
      nodes.push(node);

      project.tags.forEach(function (tag) {
        if (!hubs[tag]) {
          hubs[tag] = makeNode({ kind: "hub", label: tag, r: 6, ringAt: 0.98 + Math.random() * 0.1 });
          nodes.push(hubs[tag]);
        }
        links.push({ a: node, b: hubs[tag] });
        node.neighbors.push(hubs[tag]);
        hubs[tag].neighbors.push(node);
      });
    });

    Object.keys(hubs).forEach(function (tag) {
      hubs[tag].r = 5 + hubs[tag].neighbors.length * 0.9;
    });

    for (var i = 0; i < (window.PRIVATE_REPOS || 0); i++) {
      nodes.push(
        makeNode({
          kind: "private",
          r: 1.6 + Math.random() * 1.4,
          ringAt: 0.8 + Math.random() * 0.5,
        })
      );
    }
  }

  // Hubs that share projects sit next to each other, so their lines run along
  // the orbit rather than across the text. Each repo starts between its hubs,
  // then a few hundred silent steps let everything settle before the first frame.
  function seed() {
    var named = nodes.filter(function (n) { return n.kind === "hub"; });
    named.sort(function (a, b) {
      return HUB_ORDER.indexOf(a.label) - HUB_ORDER.indexOf(b.label);
    });
    named.forEach(function (hub, i) {
      hub.angle = (i / named.length) * Math.PI * 2 - Math.PI / 2;
    });
    nodes.forEach(function (node) {
      if (node.kind === "repo") {
        var x = 0;
        var y = 0;
        node.neighbors.forEach(function (hub) {
          x += Math.cos(hub.angle);
          y += Math.sin(hub.angle);
        });
        node.angle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.5;
      } else if (node.kind === "private") {
        node.angle = Math.random() * Math.PI * 2;
      }

      var angle = node.angle;
      if (narrow) {
        // Only the bands above and below the text exist, so fold the sides in.
        var side = Math.cos(angle) >= 0 ? 1 : -1;
        var up = Math.sin(angle) >= 0 ? 1 : -1;
        angle = Math.atan2(up * (0.6 + Math.abs(Math.sin(angle))), side * Math.abs(Math.cos(angle)));
      }
      node.x = center.x + Math.cos(angle) * ring.a * node.ringAt;
      node.y = center.y + Math.sin(angle) * ring.b * node.ringAt;
      node.phase = Math.random() * Math.PI * 2;
    });

    for (var i = 0; i < (reducedMotion ? 1500 : 420); i++) step();
  }

  // ---- layout ------------------------------------------------------------

  function measure() {
    var previous = { w: width, h: height };
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    var box = intro.getBoundingClientRect();
    var padX = 56;
    var padY = 34;
    narrow = box.width > width - 240;
    cramped = box.height > height - 170;
    document.body.classList.toggle("cramped", cramped);

    keepOut.left = box.left - padX;
    keepOut.right = box.right + padX;
    keepOut.top = box.top - padY;
    keepOut.bottom = box.bottom + padY;

    center.x = width / 2;
    center.y = (box.top + box.bottom) / 2;
    if (narrow) {
      ring.a = width / 2 - 34;
      ring.b = box.height / 2 + (height - box.height) / 4;
    } else {
      ring.a = width * 0.43;
      ring.b = height * 0.4;
    }

    if (previous.w) {
      nodes.forEach(function (n) {
        n.x *= width / previous.w;
        n.y *= height / previous.h;
      });
    }
  }

  // ---- physics -----------------------------------------------------------

  function step() {
    var settling = hovered || focused || dragged ? 0 : 1;
    orbitEase += (settling - orbitEase) * 0.06;
    if (reducedMotion || narrow) orbitEase = 0;

    var i, j, a, b, dx, dy, d2, d, force;

    // Repos and hubs push each other apart, harder sideways so labels fit.
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (a.kind === "private") continue;
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        if (b.kind === "private") continue;
        dx = a.x - b.x;
        dy = a.y - b.y;
        d2 = dx * dx + dy * dy || 1;
        if (d2 > 90000) continue;
        d = Math.sqrt(d2);
        force = 1100 / d2;
        a.vx += (dx / d) * force;
        a.vy += (dy / d) * force;
        b.vx -= (dx / d) * force;
        b.vy -= (dy / d) * force;

        if (!narrow && Math.abs(dx) < 118 && Math.abs(dy) < 40) {
          var nudge = (dx >= 0 ? 1 : -1) * 0.1;
          a.vx += nudge;
          b.vx -= nudge;
        }
      }
    }

    // Links pull connected nodes together.
    var rest = narrow ? 64 : Math.min(width, height) * 0.15;
    var floor = cramped ? 8 : hintLine.offsetHeight + 34;
    links.forEach(function (link) {
      dx = link.b.x - link.a.x;
      dy = link.b.y - link.a.y;
      d = Math.sqrt(dx * dx + dy * dy) || 1;
      force = (d - rest) * 0.0022;
      link.a.vx += (dx / d) * force;
      link.a.vy += (dy / d) * force;
      link.b.vx -= (dx / d) * force;
      link.b.vy -= (dy / d) * force;
    });

    nodes.forEach(function (node) {
      if (node === dragged) return;

      var u = (node.x - center.x) / ring.a;
      var v = (node.y - center.y) / ring.b;
      var rho = Math.sqrt(u * u + v * v) || 0.001;

      // Hold each node near its own orbit.
      if (!narrow) {
        var pull = (node.ringAt - rho) * 0.022;
        node.vx += (u / rho) * pull * ring.a * 0.25;
        node.vy += (v / rho) * pull * ring.a * 0.25;
      }

      // Circle the text. Specks further in move faster, like a real disc.
      var spin = ORBIT_SPEED * orbitEase * (node.kind === "private" ? 2.4 / node.ringAt : 1);
      node.x += -v * ring.a * spin * 1.6;
      node.y += u * ring.b * spin * 1.6;

      // On small screens nothing circles, so everything sways a little instead.
      if (narrow && !reducedMotion) {
        node.phase += 0.006;
        node.x += Math.sin(node.phase) * 0.12;
        node.y += Math.cos(node.phase * 0.7) * 0.06;
      }

      if (!cramped) pushOutOfText(node);

      // Soft walls.
      var margin = node.kind === "private" ? -10 : 26;
      if (node.x < margin) node.vx += 0.14;
      if (node.x > width - margin) node.vx -= 0.14;
      if (node.y < margin) node.vy += 0.14;
      if (node.y > height - margin - 18) node.vy -= 0.14;

      // Specks shy away from the pointer.
      if (node.kind === "private" && pointer.onCanvas) {
        dx = node.x - pointer.x;
        dy = node.y - pointer.y;
        d2 = dx * dx + dy * dy;
        if (d2 < 8100 && d2 > 1) {
          d = Math.sqrt(d2);
          node.vx += (dx / d) * (1 - d / 90) * 0.35;
          node.vy += (dy / d) * (1 - d / 90) * 0.35;
        }
      }

      node.vx *= 0.86;
      node.vy *= 0.86;
      node.x += node.vx;
      node.y += node.vy;

      // Named dots never leave the screen or sit on the hint line.
      if (node.kind !== "private") {
        node.x = Math.max(node.r + 8, Math.min(width - node.r - 8, node.x));
        node.y = Math.max(node.r + 8, Math.min(height - node.r - floor, node.y));
      }
    });

    if (dragged) {
      dragged.x = pointer.x;
      dragged.y = pointer.y;
      dragged.vx = dragged.vy = 0;
    }

    waves = waves.filter(function (wave) {
      wave.radius += 9;
      wave.life -= 0.03;
      nodes.forEach(function (node) {
        dx = node.x - wave.x;
        dy = node.y - wave.y;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (Math.abs(d - wave.radius) < 16) {
          var kick = (node.kind === "private" ? 2.6 : 1.3) * wave.life;
          node.vx += (dx / d) * kick;
          node.vy += (dy / d) * kick;
        }
      });
      return wave.life > 0;
    });
  }

  function pushOutOfText(node) {
    var pad = node.r + 2;
    var left = node.x - (keepOut.left - pad);
    var right = keepOut.right + pad - node.x;
    var top = node.y - (keepOut.top - pad);
    var bottom = keepOut.bottom + pad - node.y;
    if (left <= 0 || right <= 0 || top <= 0 || bottom <= 0) return;

    // The text spans a small screen, so sideways is never the way out.
    var nearest = narrow ? Math.min(top, bottom) : Math.min(left, right, top, bottom);
    var push = Math.min(nearest * 0.12, 2.4);
    if (nearest === top) node.vy -= push;
    else if (nearest === bottom) node.vy += push;
    else if (nearest === left) node.vx -= push;
    else node.vx += push;
  }

  // ---- drawing -----------------------------------------------------------

  function activeNode() {
    return dragged || hovered || focused || locked;
  }

  function isLit(node, active) {
    return !active || node === active || active.neighbors.indexOf(node) !== -1;
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // One opening move: the whole map unfolds outward from behind the name.
    var t = reducedMotion ? 1 : Math.min((time - startedAt) / INTRO_MS, 1);
    var fadeIn = Math.min(t * 1.6, 1);
    var spread = 0.4 + 0.6 * (1 - Math.pow(1 - t, 3));
    var active = activeNode();

    function zoom() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(center.x, center.y);
      ctx.scale(spread, spread);
      ctx.translate(-center.x, -center.y);
    }
    zoom();

    links.forEach(function (link) {
      var touches = active && (link.a === active || link.b === active);
      ctx.strokeStyle = "rgba(" + WHITE + "," + (touches ? 0.9 : active ? 0.06 : 0.2) * fadeIn + ")";
      ctx.lineWidth = touches ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(link.a.x, link.a.y);
      ctx.lineTo(link.b.x, link.b.y);
      ctx.stroke();
    });

    // Lines fade out behind the text so they never run through a sentence.
    if (!cramped) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 26 * dpr;
      ctx.fillRect(keepOut.left + 22, keepOut.top + 16, keepOut.right - keepOut.left - 44, keepOut.bottom - keepOut.top - 32);
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      zoom();
    }

    nodes.forEach(function (node) {
      var lit = isLit(node, active);
      var target = node === active ? 1 : 0;
      node.glow += (target - node.glow) * (reducedMotion ? 1 : 0.2);

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + node.glow * 3, 0, Math.PI * 2);

      if (node.kind === "private") {
        ctx.fillStyle = "rgba(" + WHITE + "," + (node === active ? 1 : active ? 0.14 : 0.38) * fadeIn + ")";
        ctx.fill();
      } else if (node.kind === "hub") {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(" + WHITE + "," + (lit ? 0.9 : 0.16) * fadeIn + ")";
        ctx.fillStyle = node === active ? "rgb(" + WHITE + ")" : "rgba(0,0,0,0)";
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(" + WHITE + "," + (lit ? 1 : 0.16) * fadeIn + ")";
        ctx.fill();
        if (node === active) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + node.glow * 8, 0, Math.PI * 2);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "rgb(" + WHITE + ")";
          ctx.stroke();
        }
      }
    });

    // Labels go last so lines never run through them.
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    nodes.forEach(function (node) {
      if (!node.label) return;
      var show = width >= 600 || node.r > 11 || (active && isLit(node, active));
      if (!show) return;
      var size = node.kind === "repo" ? 12.5 : 11.5;
      ctx.font = (node.kind === "repo" ? "500 " : "400 ") + size + 'px Roboto, system-ui, sans-serif';
      ctx.fillStyle = "rgba(" + WHITE + "," + (isLit(node, active) ? 0.92 : 0.2) * fadeIn + ")";
      ctx.fillText(node.label, node.x, node.y + node.r + 5);
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waves.forEach(function (wave) {
      ctx.strokeStyle = "rgba(" + WHITE + "," + wave.life * 0.5 + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // ---- the hover card ----------------------------------------------------

  function setCard(node, withLink) {
    if (!node) {
      card.hidden = true;
      card.textContent = "";
      card.style.pointerEvents = "";
      return;
    }

    card.textContent = "";
    var title = document.createElement("strong");
    var body = document.createElement("span");

    if (node.kind === "private") {
      title.textContent = "Private repo";
      body.textContent = "Class work, experiments, and projects still in progress.";
    } else if (node.kind === "hub") {
      title.textContent = node.label;
      body.textContent = node.neighbors.map(function (n) { return n.label; }).join(", ");
    } else {
      title.textContent = node.label;
      body.textContent = node.about;
    }
    card.appendChild(title);
    card.appendChild(body);

    if (node.kind === "repo") {
      var verb = node.live ? "Open site" : "View on GitHub";
      var action = document.createElement(withLink ? "a" : "span");
      action.className = "action";
      action.textContent = verb;
      if (withLink) {
        action.href = node.url;
        action.style.display = "block";
        card.style.pointerEvents = "auto";
      }
      card.appendChild(action);
    }

    card.hidden = false;
    positionCard(node);
  }

  function positionCard(node) {
    var box = card.getBoundingClientRect();
    var gap = node.r + (node.label ? 46 : 14); // clears the label under the dot
    var x = node.x + gap;
    var y = node.y - box.height / 2;
    if (x + box.width > width - 12) x = node.x - gap - box.width;
    if (x < 12) x = Math.max(12, Math.min(width - box.width - 12, node.x - box.width / 2));
    y = Math.max(12, Math.min(height - box.height - 12, y));
    card.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
  }

  // ---- pointer input -----------------------------------------------------

  function nodeAt(x, y, touch) {
    var best = null;
    var bestDistance = Infinity;
    nodes.forEach(function (node) {
      var reach = node.r + (touch ? 16 : node.kind === "private" ? 5 : 8);
      var d = Math.hypot(node.x - x, node.y - y);
      if (d < reach && d < bestDistance) {
        best = node;
        bestDistance = d;
      }
    });
    return best;
  }

  function setPointer(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.onCanvas = e.target === canvas;
  }

  window.addEventListener("pointermove", function (e) {
    setPointer(e);

    if (press && !dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
      if (press.node) {
        dragged = press.node;
        focused = null;
        setCard(null);
      }
    }

    if (e.pointerType === "touch") return;

    var next = pointer.onCanvas && !dragged ? nodeAt(pointer.x, pointer.y, false) : null;
    if (next !== hovered) {
      hovered = next;
      setCard(hovered, false);
    }
    canvas.style.cursor = dragged ? "grabbing" : hovered ? (hovered.url || hovered.kind === "hub" ? "pointer" : "default") : "default";
    if (reducedMotion) wake();
  });

  canvas.addEventListener("pointerdown", function (e) {
    setPointer(e);
    press = {
      x: e.clientX,
      y: e.clientY,
      touch: e.pointerType === "touch",
      node: nodeAt(pointer.x, pointer.y, e.pointerType === "touch"),
    };
    canvas.setPointerCapture(e.pointerId);
    wake();
  });

  canvas.addEventListener("pointerup", function (e) {
    setPointer(e);
    var wasDragging = !!dragged;
    dragged = null;
    settleUntil = performance.now() + 800;
    var click = press;
    press = null;
    if (wasDragging || !click) return;

    var node = click.node;
    if (click.touch) {
      // First tap explains a dot. The card holds the link.
      focused = node === focused ? null : node;
      setCard(focused, true);
      if (!node) ripple(e.clientX, e.clientY);
      return;
    }

    if (!node) {
      locked = null;
      ripple(e.clientX, e.clientY);
    } else if (node.url) {
      window.open(node.url, "_blank", "noopener");
    } else if (node.kind === "hub") {
      locked = locked === node ? null : node;
    }
    wake();
  });

  canvas.addEventListener("pointercancel", function () {
    dragged = null;
    press = null;
  });

  document.documentElement.addEventListener("pointerleave", function () {
    pointer.onCanvas = false;
    if (hovered) {
      hovered = null;
      setCard(null);
    }
  });

  function ripple(x, y) {
    if (reducedMotion) return;
    waves.push({ x: x, y: y, radius: 0, life: 1 });
  }

  // ---- keyboard access: every repo is also a real link -------------------

  function buildRepoLinks() {
    var nav = document.getElementById("repo-links");
    nodes.forEach(function (node) {
      if (node.kind !== "repo") return;
      var link = document.createElement("a");
      link.href = node.url;
      link.textContent = node.label + ": " + node.about;
      link.addEventListener("focus", function () {
        focused = node;
        setCard(node, false);
        wake();
      });
      link.addEventListener("blur", function () {
        focused = null;
        setCard(null);
        wake();
      });
      nav.appendChild(link);
    });
  }

  // ---- the loop ----------------------------------------------------------

  var last = 0;
  var spare = 0;
  var settleUntil = 0;

  function frame(time) {
    if (!running) return;
    if (document.hidden) {
      running = false;
      return;
    }

    spare += Math.min(time - last, 100);
    last = time;
    while (spare >= STEP) {
      // With reduced motion the map only moves while someone is moving it.
      if (!reducedMotion || dragged || press || time < settleUntil) step();
      spare -= STEP;
    }

    draw(time);
    var cardNode = hovered || focused;
    if (cardNode && !card.hidden) positionCard(cardNode);

    if (reducedMotion && !dragged && !press && time > settleUntil + 300) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function wake() {
    settleUntil = Math.max(settleUntil, performance.now());
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function start() {
    build();
    measure();
    measure(); // the second pass uses the narrow flag from the first
    seed();

    if (coarsePointer) hint.textContent = "Tap one to read about it, or drag it around.";

    buildRepoLinks();
    startedAt = performance.now();
    wake();
  }

  window.addEventListener("resize", function () {
    measure();
    wake();
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) wake();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      start();
    });
  } else {
    start();
  }
})();
