(function () {
    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fg = getComputedStyle(root).getPropertyValue('--fg').trim();
    var kick = function () {};

    /* theme toggle */

    var toggle = document.getElementById('theme-toggle');

    function syncToggle() {
        var light = root.getAttribute('data-theme') === 'light';
        toggle.textContent = light ? 'Dark' : 'Light';
        fg = getComputedStyle(root).getPropertyValue('--fg').trim();
        kick();
    }

    if (toggle) {
        toggle.addEventListener('click', function () {
            var light = root.getAttribute('data-theme') === 'light';
            if (light) {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', 'light');
            }
            try { localStorage.setItem('theme', light ? 'dark' : 'light'); } catch (e) {}
            syncToggle();
        });
        syncToggle();
    }

    /* loader: types the name out, then fades */

    var loaderText = document.getElementById('loader-text');
    var onLoaded = [];

    function finishLoading() {
        root.classList.add('loaded');
        onLoaded.forEach(function (fn) { fn(); });
    }

    if (loaderText && !reduceMotion) {
        var word = loaderText.getAttribute('data-text') || '';
        var typed = 0;
        var typer = setInterval(function () {
            typed++;
            loaderText.textContent = word.slice(0, typed);
            if (typed >= word.length) {
                clearInterval(typer);
                setTimeout(finishLoading, 380);
            }
        }, 75);
    } else {
        finishLoading();
    }

    /* dot-matrix Earth: real coastlines, sunlit, with city lights on the night side.
       It turns to face the cursor wherever it is on the page. */

    var canvas = document.getElementById('art');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var N = 112;                 // grid cells per side
    var R = 0.86;                // globe radius, as a fraction of the canvas half-width
    var MW = 256, MH = 128;      // land mask size (see land.js)
    var buf = new Float32Array(N * N);
    var seeds = new Float32Array(N * N);
    var bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];
    var cell = 1;
    var now = 0;
    var revealStart = null;

    var cursor = { x: 0, y: 0, at: -1e9, here: false };   // client px; here = mouse is in the window
    var look = { x: 0, y: 0 };                            // eased cursor position relative to the globe
    var startMs = null;

    for (var s = 0; s < seeds.length; s++) seeds[s] = Math.random();

    var mask = new Uint8Array(0);
    try {
        var raw = atob(window.LAND_MASK || '');
        mask = new Uint8Array(raw.length);
        for (var m = 0; m < raw.length; m++) mask[m] = raw.charCodeAt(m);
    } catch (e) {}

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function normalize(v) {
        var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
    }

    function hash(x, y) {
        var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    var sun = normalize([-0.62, -0.42, 0.66]);

    // the point facing the viewer sits at longitude -yaw, latitude -pitch;
    // start over North America (100°W, 38°N)
    var START_YAW = 100 * Math.PI / 180;
    var START_PITCH = -38 * Math.PI / 180;

    function render(t) {
        var yaw = START_YAW + t * 0.08 + look.x * 0.9;
        var pitch = START_PITCH + look.y * 0.35;
        var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

        for (var j = 0; j < N; j++) {
            for (var i = 0; i < N; i++) {
                var k = j * N + i;
                var x = ((i + 0.5) / N * 2 - 1) / R;
                var y = ((j + 0.5) / N * 2 - 1) / R;
                var d = x * x + y * y;

                if (d > 1) {
                    // thin atmosphere halo
                    var r = Math.sqrt(d);
                    var lit = Math.max(0, (x * sun[0] + y * sun[1]) / r);
                    buf[k] = r < 1.06 ? 0.4 * (1.06 - r) / 0.06 * (0.25 + lit) : 0;
                    continue;
                }

                var z = Math.sqrt(1 - d);
                var lam = x * sun[0] + y * sun[1] + z * sun[2];
                var shade = Math.max(0, lam);

                // view -> planet: undo the pitch, then the yaw
                var y1 = y * cp + z * sp, z1 = -y * sp + z * cp;
                var bx = x * cy - z1 * sy, bz = x * sy + z1 * cy;
                var lon = Math.atan2(bx, bz), lat = Math.asin(clamp(-y1, -1, 1));
                var u = Math.floor((lon + Math.PI) / (2 * Math.PI) * MW) & (MW - 1);
                var v = clamp(Math.floor((0.5 - lat / Math.PI) * MH), 0, MH - 1);
                var mk = v * MW + u;
                var land = mask.length && (mask[mk >> 3] >> (7 - (mk & 7))) & 1;

                var b;
                if (land) {
                    b = 0.06 + shade;
                    if (lam < -0.08 && hash(u, v) < 0.09) b = 1;   // city lights
                } else {
                    b = 0.015 + 0.11 * shade;
                }
                buf[k] = b + Math.pow(1 - z, 3) * 0.35 * (0.1 + shade);   // atmosphere at the limb
            }
        }
    }

    function track(t, ease) {
        var gx, gy;
        if (cursor.here || now - cursor.at < 3000) {
            var r = canvas.getBoundingClientRect();
            gx = ((cursor.x - r.left) / r.width - 0.5) * 2;
            gy = ((cursor.y - r.top) / r.height - 0.5) * 2;
        } else {
            // nobody around: drift slowly so it's never still
            gx = Math.sin(t * 0.6) * 0.56;
            gy = Math.sin(t * 0.95) * 0.3;
        }
        look.x += (clamp(gx, -1.5, 1.5) - look.x) * ease;
        look.y += (clamp(gy, -1.5, 1.5) - look.y) * ease;
    }

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        var w = canvas.getBoundingClientRect().width;
        canvas.width = canvas.height = Math.round(w * dpr);
        cell = canvas.width / N;
    }

    function frame(ms) {
        now = ms;
        if (startMs === null) startMs = ms;
        var t = reduceMotion ? 0 : (ms - startMs) / 1000;
        track(t, reduceMotion ? 1 : 0.08);
        render(t);

        // dots resolve out of noise on load
        var progress = 1;
        if (!reduceMotion) {
            if (revealStart === null) revealStart = ms;
            progress = Math.min(1, (ms - revealStart) / 1200);
        }

        var dot = cell * 0.72;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = fg;

        for (var j = 0; j < N; j++) {
            for (var i = 0; i < N; i++) {
                var k = j * N + i;
                var on = seeds[k] > progress
                    ? Math.random() < 0.1 * (1 - progress)
                    : buf[k] > (bayer[j & 3][i & 3] + 0.5) / 16;
                if (on) ctx.fillRect(i * cell, j * cell, dot, dot);
            }
        }

        if (!reduceMotion) requestAnimationFrame(frame);
    }

    window.addEventListener('resize', function () {
        resize();
        kick();
    });

    window.addEventListener('pointermove', function (e) {
        cursor.x = e.clientX;
        cursor.y = e.clientY;
        cursor.at = performance.now();
        cursor.here = e.pointerType !== 'touch';
        kick();
    });

    root.addEventListener('mouseleave', function () { cursor.here = false; });
    window.addEventListener('blur', function () { cursor.here = false; });

    resize();

    function start() {
        if (reduceMotion) {
            kick = function () { requestAnimationFrame(frame); };
        }
        requestAnimationFrame(frame);
    }

    onLoaded.push(start);
    if (root.classList.contains('loaded')) start();
})();
